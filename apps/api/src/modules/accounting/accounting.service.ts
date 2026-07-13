import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AccountingRepository } from './accounting.repository';
import { CreateChargeDto } from './dto/create-charge.dto';
import { AdjustChargeDto } from './dto/adjust-charge.dto';
import { ChargeQueryDto } from './dto/charge-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { ChargeService } from './charge.service';
import { LedgerService } from './ledger.service';
import {
  FinancialLedger,
  RentCharge,
  LedgerBalanceHistory,
  LedgerType,
  ChargeStatus,
  ChargeType,
  LedgerTriggerEvent,
  UserRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountingService {
  constructor(
    private readonly accountingRepository: AccountingRepository,
    private readonly prisma: PrismaService,
    private readonly chargeService: ChargeService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Public hook explicitly invoked by LeaseService after successful lease activation.
   */
  async initializeLedgers(leaseId: string): Promise<void> {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId, deletedAt: null },
    });
    if (!lease) {
      throw new NotFoundException(`Lease with ID ${leaseId} not found.`);
    }
    await this.initializeLedgersForLease(lease.id, lease.securityDeposit, lease.startDate);
  }

  /**
   * Retrieves all ledgers (Operating and Trust) for a specific Lease.
   */
  async findLedgersByLeaseId(
    leaseId: string,
    user: { id: string; role: string },
  ): Promise<FinancialLedger[]> {
    await this.accountingRepository.validateLeaseAccess(leaseId, user);
    
    let ledgers = await this.accountingRepository.findLedgersByLeaseId(leaseId);

    // Lazy initialization check if lease is active but ledgers were not created yet
    if (ledgers.length === 0) {
      const lease = await this.prisma.lease.findFirst({
        where: { id: leaseId, deletedAt: null },
      });
      if (lease && lease.status === 'ACTIVE') {
        await this.initializeLedgersForLease(lease.id, lease.securityDeposit, lease.startDate);
        ledgers = await this.accountingRepository.findLedgersByLeaseId(leaseId);
      }
    }

    return ledgers;
  }

  /**
   * Retrieves dashboard summary data for a lease.
   */
  async getLeaseSummary(
    leaseId: string,
    user: { id: string; role: string },
  ): Promise<{
    operatingBalance: number;
    trustBalance: number;
    outstandingCharges: Array<{
      id: string;
      type: ChargeType;
      amount: number;
      dueDate: Date;
      status: ChargeStatus;
    }>;
    nextDueCharge: {
      id: string;
      type: ChargeType;
      amount: number;
      dueDate: Date;
    } | null;
    chargeCounts: Record<ChargeStatus, number>;
  }> {
    await this.accountingRepository.validateLeaseAccess(leaseId, user);

    const ledgers = await this.findLedgersByLeaseId(leaseId, user);
    const opLedger = ledgers.find((l) => l.ledgerType === LedgerType.OPERATING);
    const trustLedger = ledgers.find((l) => l.ledgerType === LedgerType.TRUST);

    const opBalance = opLedger ? opLedger.runningBalance.toNumber() : 0.00;
    const trBalance = trustLedger ? trustLedger.runningBalance.toNumber() : 0.00;

    // Fetch all charges for both ledgers
    const ledgerIds = ledgers.map((l) => l.id);
    const charges = await this.prisma.rentCharge.findMany({
      where: {
        ledgerId: { in: ledgerIds },
      },
      orderBy: { dueDate: 'asc' },
    });

    const outstandingCharges = charges
      .filter((c) => c.status === ChargeStatus.UNPAID || c.status === ChargeStatus.PARTIALLY_PAID)
      .map((c) => ({
        id: c.id,
        type: c.type,
        amount: c.amount.toNumber() - c.paidAmount.toNumber(),
        dueDate: c.dueDate,
        status: c.status,
      }));

    // Find the next due charge in the future, or the nearest unpaid charge
    const now = new Date();
    const futureOutstanding = outstandingCharges.filter((c) => c.dueDate >= now);
    const nextDue = futureOutstanding.length > 0 ? futureOutstanding[0] : (outstandingCharges[0] || null);

    const chargeCounts: Record<ChargeStatus, number> = {
      [ChargeStatus.PAID]: 0,
      [ChargeStatus.UNPAID]: 0,
      [ChargeStatus.PARTIALLY_PAID]: 0,
      [ChargeStatus.VOIDED]: 0,
    };

    for (const c of charges) {
      chargeCounts[c.status]++;
    }

    return {
      operatingBalance: opBalance,
      trustBalance: trBalance,
      outstandingCharges,
      nextDueCharge: nextDue
        ? {
            id: nextDue.id,
            type: nextDue.type,
            amount: nextDue.amount,
            dueDate: nextDue.dueDate,
          }
        : null,
      chargeCounts,
    };
  }

  /**
   * Retrieves paginated balance history for a target ledger.
   */
  async findLedgerHistory(
    ledgerId: string,
    query: { page: number; limit: number },
    user: { id: string; role: string },
  ): Promise<{
    data: LedgerBalanceHistory[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const ledger = await this.accountingRepository.findLedgerById(ledgerId);
    if (!ledger) {
      throw new NotFoundException(`Ledger with ID ${ledgerId} not found.`);
    }

    await this.accountingRepository.validateLeaseAccess(ledger.leaseId, user);

    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.accountingRepository.findHistory(ledgerId, skip, query.limit),
      this.accountingRepository.countHistory(ledgerId),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  /**
   * Creates a manual one-time charge (e.g. late fees, utilities, etc.).
   */
  async createCharge(
    dto: CreateChargeDto,
    user: { id: string; role: string },
  ): Promise<RentCharge> {
    await this.accountingRepository.validateLeaseAccess(dto.leaseId, user);

    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to create charges.');
    }

    return await this.chargeService.createOneOffCharge(
      dto.leaseId,
      dto.type,
      new Prisma.Decimal(dto.amount),
      new Date(dto.dueDate),
      dto.description
    );
  }

  /**
   * Lists charges based on filter parameters and permissions.
   */
  async findAllCharges(
    query: ChargeQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: RentCharge[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (query.page - 1) * query.limit;
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;

    if (user.role === UserRole.TENANT) {
      const tenantLeases = await this.prisma.leaseTenant.findMany({
        where: { tenantId: user.id },
        select: { leaseId: true },
      });
      const leaseIds = tenantLeases.map((tl) => tl.leaseId);
      
      if (query.leaseId && !leaseIds.includes(query.leaseId)) {
        throw new ForbiddenException('You do not have access to view charges for this lease.');
      }
      
      query.leaseId = query.leaseId || (leaseIds.length > 0 ? leaseIds[0] : 'non-existent-uuid');
    }

    if (query.leaseId && user.role !== UserRole.TENANT) {
      await this.accountingRepository.validateLeaseAccess(query.leaseId, user);
    }

    const searchParams = {
      skip,
      take: query.limit,
      leaseId: query.leaseId,
      ledgerId: query.ledgerId,
      status: query.status,
      type: query.type,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      landlordId,
    };

    const [data, total] = await Promise.all([
      this.accountingRepository.findCharges(searchParams),
      this.accountingRepository.countCharges(searchParams),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  /**
   * Voids an unpaid charge.
   */
  async voidCharge(
    chargeId: string,
    user: { id: string; role: string },
  ): Promise<RentCharge> {
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to void charges.');
    }

    const charge = await this.accountingRepository.findChargeById(chargeId);
    if (!charge) {
      throw new NotFoundException(`Charge with ID ${chargeId} not found.`);
    }

    await this.accountingRepository.validateLeaseAccess(charge.ledger.leaseId, user);

    return await this.chargeService.voidCharge(chargeId);
  }

  /**
   * Applies credit adjustments to a charge without creating any Payment records.
   */
  async adjustCharge(
    chargeId: string,
    dto: AdjustChargeDto,
    user: { id: string; role: string },
  ): Promise<RentCharge> {
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to adjust charges.');
    }

    const charge = await this.accountingRepository.findChargeById(chargeId);
    if (!charge) {
      throw new NotFoundException(`Charge with ID ${chargeId} not found.`);
    }

    await this.accountingRepository.validateLeaseAccess(charge.ledger.leaseId, user);

    return await this.chargeService.updateChargeAmount(chargeId, new Prisma.Decimal(dto.amount));
  }

  /**
   * Internal balance recalculation callback triggered by the Payment module when a Payment clears or is allocated.
   */
  async handlePaymentApplied(
    ledgerId: string,
    paymentId: string,
    allocatedAmount: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.financialLedger.findUniqueOrThrow({
        where: { id: ledgerId },
      });

      const oldBalance = ledger.runningBalance;
      const amountToDeduct = new Prisma.Decimal(allocatedAmount);
      const newBalance = oldBalance.minus(amountToDeduct);

      await tx.financialLedger.update({
        where: { id: ledgerId },
        data: { runningBalance: newBalance },
      });

      await tx.ledgerBalanceHistory.create({
        data: {
          ledgerId,
          oldBalance,
          newBalance,
          triggerEventType: LedgerTriggerEvent.PAYMENT,
          triggerEventId: paymentId,
        },
      });
    });
  }

  /**
   * Internal helper to initialize ledgers.
   */
  private async initializeLedgersForLease(
    leaseId: string,
    securityDeposit: number | Prisma.Decimal,
    startDate: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.ledgerService.createLedgersForLease(leaseId, tx);

      if (securityDeposit && new Prisma.Decimal(securityDeposit).gt(0)) {
        await this.chargeService.createOneOffCharge(
          leaseId,
          ChargeType.SECURITY_DEPOSIT,
          new Prisma.Decimal(securityDeposit),
          startDate,
          'Initial Security Deposit Requirement',
          tx
        );
      }
    });
  }
}
