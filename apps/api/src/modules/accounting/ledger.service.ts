import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { 
  FinancialLedger, 
  LedgerType, 
  LedgerTriggerEvent, 
  LedgerBalanceHistory, 
  Prisma 
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes the required ledgers (OPERATING and TRUST) for a newly active lease.
   * Hardened using createMany with skipDuplicates to prevent Postgres transaction aborts
   * during concurrent race conditions.
   */
  async createLedgersForLease(
    leaseId: string, 
    tx?: Prisma.TransactionClient
  ): Promise<FinancialLedger[]> {
    const operation = async (client: Prisma.TransactionClient | Omit<PrismaService, '$on'>) => {
      // 1. Optimistic Idempotency check
      const existingLedgers = await client.financialLedger.findMany({
        where: { leaseId },
      });

      if (existingLedgers.length > 0) {
        return existingLedgers;
      }

      // 2. Insert ledgers using ON CONFLICT DO NOTHING (skipDuplicates).
      // This prevents the dreaded Postgres "25P02: current transaction is aborted" error
      // if another thread inserts the ledgers simultaneously, because it gracefully skips
      // rather than throwing a hard P2002 constraint error that poisons the transaction.
      await client.financialLedger.createMany({
        data: [
          {
            leaseId,
            ledgerType: LedgerType.OPERATING,
            runningBalance: 0, // Using standard number as createMany accepts decimal-compatible primitives
          },
          {
            leaseId,
            ledgerType: LedgerType.TRUST,
            runningBalance: 0,
          },
        ],
        skipDuplicates: true,
      });

      // 3. Safely fetch and return the ledgers (whether we just created them, or the concurrent thread did).
      return await client.financialLedger.findMany({
        where: { leaseId },
      });
    };

    return tx ? operation(tx) : this.prisma.$transaction(operation);
  }

  /**
   * Retrieves a specific ledger for a lease. Throws an error if not found.
   */
  async getLedger(
    leaseId: string, 
    ledgerType: LedgerType,
    tx?: Prisma.TransactionClient
  ): Promise<FinancialLedger> {
    const client = tx || this.prisma;
    
    const ledger = await client.financialLedger.findUnique({
      where: {
        leaseId_ledgerType: {
          leaseId,
          ledgerType,
        },
      },
    });

    if (!ledger) {
      throw new NotFoundException(`FinancialLedger of type ${ledgerType} not found for lease ${leaseId}`);
    }

    return ledger;
  }

  /**
   * The ONLY authorized method for altering a ledger's running balance.
   * Atomically applies the delta to FinancialLedger.runningBalance and inserts a LedgerBalanceHistory row.
   * 
   * @param tx - Strictly required so this update runs in the same transaction as the triggering operation.
   */
  async updateBalance(
    params: {
      ledgerId: string;
      amountDelta: Decimal; // Positive to increase balance, negative to decrease
      triggerEventType: LedgerTriggerEvent;
      triggerEventId: string; 
    },
    tx: Prisma.TransactionClient
  ): Promise<{
    ledger: FinancialLedger;
    history: LedgerBalanceHistory;
  }> {
    if (!tx) {
      throw new InternalServerErrorException('LedgerService.updateBalance strictly requires a Prisma.TransactionClient for atomicity.');
    }

    // 1. Explicitly lock the ledger row to prevent lost updates during concurrent calls.
    const lockedLedgers = await tx.$queryRaw<FinancialLedger[]>`
      SELECT * FROM "FinancialLedger" 
      WHERE id = ${params.ledgerId} 
      FOR UPDATE
    `;

    if (!lockedLedgers || lockedLedgers.length === 0) {
      throw new NotFoundException(`FinancialLedger with id ${params.ledgerId} not found during balance update.`);
    }

    const oldBalance = new Decimal(lockedLedgers[0].runningBalance as any);
    const newBalance = oldBalance.plus(params.amountDelta);

    // 2. Update the ledger balance
    const updatedLedger = await tx.financialLedger.update({
      where: { id: params.ledgerId },
      data: { runningBalance: newBalance },
    });

    // 3. Create the history record in the exact same transaction
    const history = await tx.ledgerBalanceHistory.create({
      data: {
        ledgerId: params.ledgerId,
        oldBalance: oldBalance,
        newBalance: newBalance,
        triggerEventType: params.triggerEventType,
        triggerEventId: params.triggerEventId,
      },
    });

    return {
      ledger: updatedLedger,
      history,
    };
  }
}
