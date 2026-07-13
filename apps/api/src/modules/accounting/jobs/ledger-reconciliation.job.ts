import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ChargeStatus, PaymentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class LedgerReconciliationJob {
  private readonly logger = new Logger(LedgerReconciliationJob.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scans all active ledgers and validates the mathematical consistency:
   * runningBalance == (Sum of active charges) - (Sum of cleared payments)
   */
  async runReconciliation(): Promise<{
    processedCount: number;
    anomaliesFound: number;
    details: Array<{ ledgerId: string; calculated: string; running: string; difference: string }>;
  }> {
    this.logger.log('Starting LedgerReconciliationJob...');

    // Fetch all ledgers that belong to active (non-soft-deleted) leases
    const ledgers = await this.prisma.financialLedger.findMany({
      where: {
        lease: {
          deletedAt: null,
        },
      },
      include: {
        rentCharges: {
          where: {
            status: { not: ChargeStatus.VOIDED },
          },
        },
        payments: {
          where: {
            status: PaymentStatus.CLEARED,
          },
        },
      },
    });

    let processedCount = 0;
    let anomaliesFound = 0;
    const details: Array<{ ledgerId: string; calculated: string; running: string; difference: string }> = [];

    for (const ledger of ledgers) {
      processedCount++;

      // Compute total active charges
      const totalCharges = ledger.rentCharges.reduce(
        (sum, charge) => sum.plus(charge.amount),
        new Prisma.Decimal(0.00),
      );

      // Compute total cleared payments
      const totalPayments = ledger.payments.reduce(
        (sum, payment) => sum.plus(payment.amount),
        new Prisma.Decimal(0.00),
      );

      // Invariant: Balance = Charges - Payments
      const expectedBalance = totalCharges.minus(totalPayments);
      const actualBalance = ledger.runningBalance;

      if (!expectedBalance.equals(actualBalance)) {
        anomaliesFound++;
        const difference = actualBalance.minus(expectedBalance);
        
        this.logger.warn(
          `Reconciliation anomaly detected on ledger ${ledger.id} (Lease: ${ledger.leaseId}). ` +
          `Expected calculated balance: ${expectedBalance.toString()}, ` +
          `Actual running balance in DB: ${actualBalance.toString()}. ` +
          `Difference: ${difference.toString()}`,
        );

        details.push({
          ledgerId: ledger.id,
          calculated: expectedBalance.toString(),
          running: actualBalance.toString(),
          difference: difference.toString(),
        });
      }
    }

    this.logger.log(
      `LedgerReconciliationJob finished. ` +
      `Processed ${processedCount} ledgers. ` +
      `Found ${anomaliesFound} anomalies.`,
    );

    return {
      processedCount,
      anomaliesFound,
      details,
    };
  }
}
