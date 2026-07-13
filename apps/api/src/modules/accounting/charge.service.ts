import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { 
  RentCharge, 
  ChargeType, 
  ChargeStatus, 
  Prisma 
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ChargeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the bundle of recurring charges (rent, recurring fees) for a lease for a specific billing month.
   */
  async generateMonthlyCharges(
    leaseId: string,
    billingMonth: Date,
    tx?: Prisma.TransactionClient
  ): Promise<RentCharge[]> {
    const client = tx || this.prisma;

    // 1. Fetch lease and relevant split rules
    const lease = await client.lease.findUnique({
      where: { id: leaseId },
      include: {
        financialLedgers: true,
        chargeSplitRules: true,
      },
    });

    if (!lease) throw new NotFoundException('Lease not found');

    const trustLedger = lease.financialLedgers.find(l => l.ledgerType === 'TRUST');
    
    if (!trustLedger) {
      throw new InternalServerErrorException('Lease is missing TRUST ledger');
    }

    // 2. Fetch the active base percentage (fallback if no specific ChargeSplitRule exists)
    const baseSplitHistory = await client.leaseSharePercentageHistory.findFirst({
      where: { 
        leaseId, 
        effectiveFrom: { lte: new Date() } 
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const defaultLandlordPercentage = baseSplitHistory 
      ? new Decimal(baseSplitHistory.landlordSharePercentage as any) 
      : new Decimal(100);

    // 3. Determine the snapshot percentages for each charge type
    const rentSplitRule = lease.chargeSplitRules.find(r => r.chargeType === ChargeType.RENT);
    const rentLandlordPercentage = rentSplitRule 
      ? new Decimal(rentSplitRule.landlordSharePercentage as any) 
      : defaultLandlordPercentage;

    // We can expand this list to include late fees or other recurring charges based on config.
    // For now, generating the core Rent charge.
    const chargesToCreate: Prisma.RentChargeCreateManyInput[] = [
      {
        leaseId,
        ledgerId: trustLedger.id, // Tenant-facing charges ALWAYS hit the TRUST ledger
        billingMonth,
        type: ChargeType.RENT,
        amount: new Decimal(lease.monthlyRent as any),
        paidAmount: 0,
        status: ChargeStatus.UNPAID,
        // The exact dueDate is simplified here to billingMonth + rentDueDay
        dueDate: new Date(billingMonth.getFullYear(), billingMonth.getMonth(), lease.rentDueDay),
        description: `Rent for ${billingMonth.toISOString().slice(0, 7)}`,
        landlordSharePercentageSnapshot: rentLandlordPercentage,
      }
    ];

    await client.rentCharge.createMany({
      data: chargesToCreate,
      skipDuplicates: true, // Idempotent generation
    });

    return await client.rentCharge.findMany({
      where: {
        leaseId,
        billingMonth,
      }
    });
  }

  /**
   * Creates a manual one-time charge (e.g. late fees, utilities, security deposit).
   */
  async createOneOffCharge(
    leaseId: string,
    type: ChargeType,
    amount: Decimal,
    dueDate: Date,
    description: string,
    tx?: Prisma.TransactionClient
  ): Promise<RentCharge> {
    if (type === ChargeType.RENT) {
      throw new BadRequestException('RENT charges must only be created via generateMonthlyCharges.');
    }

    const client = tx || this.prisma;

    // 1. Fetch lease, ledgers, and rules
    const lease = await client.lease.findUnique({
      where: { id: leaseId },
      include: {
        financialLedgers: true,
        chargeSplitRules: true,
      },
    });

    if (!lease) throw new NotFoundException('Lease not found');

    const trustLedger = lease.financialLedgers.find(l => l.ledgerType === 'TRUST');
    if (!trustLedger) {
      throw new InternalServerErrorException('Lease is missing TRUST ledger');
    }

    // 2. Determine snapshot percentage
    const baseSplitHistory = await client.leaseSharePercentageHistory.findFirst({
      where: { leaseId, effectiveFrom: { lte: new Date() } },
      orderBy: { effectiveFrom: 'desc' },
    });

    const defaultLandlordPercentage = baseSplitHistory 
      ? new Decimal(baseSplitHistory.landlordSharePercentage as any) 
      : new Decimal(100);

    const specificSplitRule = lease.chargeSplitRules.find(r => r.chargeType === type);
    const landlordPercentage = specificSplitRule 
      ? new Decimal(specificSplitRule.landlordSharePercentage as any) 
      : defaultLandlordPercentage;

    // 3. Create charge linked ONLY to TRUST ledger
    return await client.rentCharge.create({
      data: {
        leaseId,
        ledgerId: trustLedger.id,
        billingMonth: dueDate,
        dueDate,
        type,
        amount,
        paidAmount: 0,
        status: ChargeStatus.UNPAID,
        description,
        landlordSharePercentageSnapshot: landlordPercentage,
      },
    });
  }

  /**
   * Voids an unpaid charge. Enforces immutability: cannot void if any allocation exists.
   */
  async voidCharge(
    chargeId: string,
    tx?: Prisma.TransactionClient
  ): Promise<RentCharge> {
    const client = tx || this.prisma;

    const charge = await client.rentCharge.findUnique({
      where: { id: chargeId },
      include: { paymentAllocations: true },
    });

    if (!charge) throw new NotFoundException('Charge not found');

    if (charge.status === ChargeStatus.VOIDED) {
      throw new BadRequestException('Charge is already voided');
    }

    if (charge.paymentAllocations.length > 0 || charge.status !== ChargeStatus.UNPAID) {
      throw new BadRequestException('Cannot void a charge that has payment allocations. Corrections require adjustments.');
    }

    // Note: No balance reversal required because unpaid AR charges do not touch FinancialLedger.runningBalance
    return await client.rentCharge.update({
      where: { id: chargeId },
      data: { status: ChargeStatus.VOIDED },
    });
  }

  /**
   * Allows PMC to edit the total amount of a specific charge.
   */
  async updateChargeAmount(
    chargeId: string,
    newAmount: Decimal,
    tx?: Prisma.TransactionClient
  ): Promise<RentCharge> {
    if (newAmount.lessThan(0)) {
      throw new BadRequestException('Charge amount cannot be negative. Concessions/credits are out of scope.');
    }

    const client = tx || this.prisma;

    const charge = await client.rentCharge.findUnique({
      where: { id: chargeId },
      include: { paymentAllocations: true },
    });

    if (!charge) throw new NotFoundException('Charge not found');

    if (charge.status !== ChargeStatus.UNPAID) {
      throw new BadRequestException('Can only edit charges that are fully UNPAID');
    }

    if (charge.paymentAllocations.length > 0) {
      throw new BadRequestException('Cannot edit a charge that already has payment allocations');
    }

    return await client.rentCharge.update({
      where: { id: chargeId },
      data: { amount: newAmount },
    });
  }

  /**
   * Identifies the oldest unresolved billing cycle for FIFO enforcement.
   */
  async getOldestUnsettledBillingMonth(
    leaseId: string,
    tx?: Prisma.TransactionClient
  ): Promise<{
    billingMonth: Date;
    totalRemainingBalance: Decimal; 
  } | null> {
    const client = tx || this.prisma;

    const unsettledCharges = await client.rentCharge.findMany({
      where: {
        leaseId,
        status: { in: [ChargeStatus.UNPAID, ChargeStatus.PARTIALLY_PAID] },
      },
      orderBy: { billingMonth: 'asc' },
    });

    if (unsettledCharges.length === 0) {
      return null;
    }

    // The first item is the oldest month due to the orderBy
    const oldestMonth = unsettledCharges[0].billingMonth;

    // Group all charges that share this exact oldest billing month
    const oldestMonthCharges = unsettledCharges.filter(
      (c) => c.billingMonth.getTime() === oldestMonth.getTime()
    );

    const totalRemainingBalance = oldestMonthCharges.reduce((sum, charge) => {
      const chargeAmount = new Decimal(charge.amount as any);
      const paid = new Decimal(charge.paidAmount as any);
      return sum.plus(chargeAmount.minus(paid));
    }, new Decimal(0));

    return {
      billingMonth: oldestMonth,
      totalRemainingBalance,
    };
  }

  /**
   * The SOLE method authorized to update RentCharge.paidAmount and RentCharge.status.
   */
  async applyAllocation(
    chargeId: string,
    allocatedAmountDelta: Decimal, 
    tx: Prisma.TransactionClient
  ): Promise<RentCharge> {
    if (!tx) {
      throw new InternalServerErrorException('applyAllocation strictly requires a Prisma.TransactionClient for atomicity.');
    }

    if (allocatedAmountDelta.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Allocation amount must be strictly greater than 0');
    }

    // Explicit row-level lock on the charge to prevent race conditions during concurrent payments
    const lockedCharges = await tx.$queryRaw<RentCharge[]>`
      SELECT * FROM "RentCharge" 
      WHERE id = ${chargeId} 
      FOR UPDATE
    `;

    if (!lockedCharges || lockedCharges.length === 0) {
      throw new NotFoundException(`RentCharge with id ${chargeId} not found during allocation update`);
    }

    const charge = lockedCharges[0];
    const currentPaid = new Decimal(charge.paidAmount as any);
    const totalAmount = new Decimal(charge.amount as any);
    
    const newPaidAmount = currentPaid.plus(allocatedAmountDelta);

    if (newPaidAmount.greaterThan(totalAmount)) {
      throw new BadRequestException('Cannot allocate more funds than the total charge amount');
    }

    let newStatus: ChargeStatus = ChargeStatus.PARTIALLY_PAID;
    if (newPaidAmount.equals(totalAmount)) {
      newStatus = ChargeStatus.PAID;
    }

    return await tx.rentCharge.update({
      where: { id: chargeId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });
  }
}
