import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, PaymentAllocation, ChargeType, ChargeStatus } from '@prisma/client';
import { ChargeService } from '../accounting/charge.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AllocationService {
  constructor(private readonly chargeService: ChargeService) {}

  /**
   * Defines the hardcoded priority order for applying funds across different charge types
   * within the exact-amount monthly payment.
   */
  private getChargePriority(type: ChargeType): number {
    switch (type) {
      case ChargeType.SECURITY_DEPOSIT: return 1;
      case ChargeType.RENT: return 2;
      case ChargeType.LATE_FEE: return 3;
      case ChargeType.UTILITY: return 4;
      case ChargeType.MISC: return 5;
      default: return 99;
    }
  }

  /**
   * Translates a single payment into specific mathematical allocations against unsettled charges.
   * Applies the snapshotted split percentages and deterministic rounding rules.
   */
  async executeAllocation(
    paymentId: string,
    leaseId: string,
    billingMonth: Date,
    amountToAllocateTotal: Prisma.Decimal,
    tx: Prisma.TransactionClient
  ): Promise<PaymentAllocation[]> {
    const unsettledCharges = await tx.rentCharge.findMany({
      where: { 
        leaseId, 
        billingMonth, 
        status: { in: [ChargeStatus.UNPAID, ChargeStatus.PARTIALLY_PAID] }
      },
    });

    // Sort in memory by our deterministic priority order
    unsettledCharges.sort((a, b) => this.getChargePriority(a.type) - this.getChargePriority(b.type));

    let remainingPayment = amountToAllocateTotal;
    const allocations: PaymentAllocation[] = [];

    for (const charge of unsettledCharges) {
      if (remainingPayment.lte(0)) break;

      const chargeAmount = new Decimal(charge.amount as any);
      const paidAmount = new Decimal(charge.paidAmount as any);
      const remainingChargeBalance = chargeAmount.minus(paidAmount);

      const amountToAllocate = Decimal.min(remainingChargeBalance, remainingPayment);

      if (amountToAllocate.lte(0)) continue;

      const snapshot = new Decimal(charge.landlordSharePercentageSnapshot as any);

      // Rounding rule: Landlord rounds UP to 2 decimals, Company absorbs the shortfall
      const landlordShareAmount = amountToAllocate
        .mul(snapshot.div(100))
        .toDecimalPlaces(2, Decimal.ROUND_UP);
      
      const companyShareAmount = amountToAllocate.minus(landlordShareAmount);

      const allocation = await tx.paymentAllocation.create({
        data: {
          paymentId,
          rentChargeId: charge.id,
          landlordShareAmount,
          companyShareAmount,
          allocatedAt: new Date(), // Timestamp of allocation
        }
      });
      allocations.push(allocation);

      // Delegate state mutation of the RentCharge to the authoritative service
      await this.chargeService.applyAllocation(charge.id, amountToAllocate, tx);

      remainingPayment = remainingPayment.minus(amountToAllocate);
    }

    if (remainingPayment.gt(0)) {
       // Should theoretically never hit this because recordPaymentReceived does exact-amount validation
       throw new InternalServerErrorException('Payment exceeded total unsettled charge balances during allocation.');
    }

    return allocations;
  }
}
