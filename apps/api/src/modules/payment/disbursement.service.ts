import { Injectable, BadRequestException } from '@nestjs/common';
import { Disbursement, DisbursementStatus, DisbursementMethod, Prisma, LedgerTriggerEvent, LedgerType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/ledger.service';

@Injectable()
export class DisbursementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Computes the current "amount owed" to the landlord for a given lease.
   * Computed as: sum(PaymentAllocation.landlordShareAmount for the lease) 
   *              - sum(Disbursement.amount where status = PAID for the lease).
   */
  async computeLandlordAmountOwed(
    leaseId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Decimal> {
    const client = tx || this.prisma;

    // Sum of PaymentAllocation.landlordShareAmount for the lease
    const allocations = await client.paymentAllocation.aggregate({
      where: {
        rentCharge: {
          leaseId,
        },
      },
      _sum: {
        landlordShareAmount: true,
      },
    });

    // Sum of Disbursement.amount where status = PAID for the lease
    const disbursements = await client.disbursement.aggregate({
      where: {
        leaseId,
        status: DisbursementStatus.PAID,
      },
      _sum: {
        amount: true,
      },
    });

    const totalAllocated = allocations._sum.landlordShareAmount || new Decimal(0);
    const totalPaid = disbursements._sum.amount || new Decimal(0);

    return totalAllocated.minus(totalPaid);
  }

  /**
   * Computes the current net retained balance for the company for a given lease.
   * Computed as: sum(PaymentAllocation.companyShareAmount) 
   *              - sum(CompanyMaintenanceDeduction.amount)
   */
  async computeCompanyRetainedBalance(
    leaseId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Decimal> {
    const client = tx || this.prisma;

    const allocations = await client.paymentAllocation.aggregate({
      where: { rentCharge: { leaseId } },
      _sum: { companyShareAmount: true },
    });
    
    const deductions = await client.companyMaintenanceDeduction.aggregate({
      where: { leaseId },
      _sum: { amount: true },
    });

    const totalCompanyShare = allocations._sum.companyShareAmount || new Decimal(0);
    const totalDeductions = deductions._sum.amount || new Decimal(0);

    return totalCompanyShare.minus(totalDeductions);
  }

  /**
   * Creates a new manual disbursement record for a lease.
   * 
   * Transactional Flow:
   * 1. Wraps execution in `$transaction` (if `tx` is not provided).
   * 2. Executes `SELECT ... FOR UPDATE` on the Lease to acquire a row lock.
   * 3. Calls `computeLandlordAmountOwed(leaseId, tx)`.
   * 4. Validates `amount <= owed`; throws BadRequestException if overpaid.
   * 5. Creates the Disbursement record with an initial PENDING status.
   * 6. Calls `updateDisbursementStatus(..., PAID, ..., tx)` to transition it,
   *    ensuring the ledger update fires atomically.
   */
  async createManualDisbursement(
    leaseId: string,
    amount: Decimal,
    referenceNote: string | null,
    recordedByUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Disbursement> {
    const runTx = async (t: Prisma.TransactionClient) => {
      // 1. Lock the lease to prevent concurrent disbursement creations from bypassing checks
      await t.$queryRaw`SELECT 1 FROM "Lease" WHERE id = ${leaseId} FOR UPDATE`;

      // 2. Compute amount owed
      const currentlyOwed = await this.computeLandlordAmountOwed(leaseId, t);

      // 3. Overpayment check
      if (amount.greaterThan(currentlyOwed)) {
        throw new BadRequestException(
          `Cannot disburse ${amount.toString()}. Landlord is only owed ${currentlyOwed.toString()}.`
        );
      }

      // 4. Create the disbursement record (starts as PENDING)
      const disbursement = await t.disbursement.create({
        data: {
          leaseId,
          amount,
          method: DisbursementMethod.MANUAL,
          status: DisbursementStatus.PENDING,
          reference: referenceNote,
          recordedByUserId,
        },
      });

      // 5. Immediately transition to PAID through authoritative method
      return this.updateDisbursementStatus(
        disbursement.id,
        DisbursementStatus.PAID,
        recordedByUserId,
        t,
      );
    };

    return tx ? runTx(tx) : this.prisma.$transaction(runTx);
  }

  /**
   * Authoritative single-writer method for updating a Disbursement's status.
   * 
   * Transactional Flow:
   * - If `tx` is not provided, wraps execution in `this.prisma.$transaction(...)`.
   * 
   * When transitioning to PAID:
   * 1. Re-validates that the disbursement amount <= `computeLandlordAmountOwed` 
   *    (safety check if called directly).
   * 2. Updates the disbursement status.
   * 3. Calls `LedgerService.updateBalance(..., tx)` with a NEGATIVE delta 
   *    on the lease's TRUST ledger using `LedgerTriggerEvent.DISBURSEMENT`.
   */
  async updateDisbursementStatus(
    disbursementId: string,
    newStatus: DisbursementStatus,
    updatedByUserId: string, // Kept in signature as requested, maybe used for logging history later
    tx?: Prisma.TransactionClient,
  ): Promise<Disbursement> {
    const runTx = async (t: Prisma.TransactionClient) => {
      // Lock the disbursement record itself
      await t.$queryRaw`SELECT 1 FROM "Disbursement" WHERE id = ${disbursementId} FOR UPDATE`;

      const disbursement = await t.disbursement.findUniqueOrThrow({
        where: { id: disbursementId },
      });

      // No-op if status is unchanged
      if (disbursement.status === newStatus) {
        return disbursement;
      }

      // 0. V1 Limitation Guard: Prevent transitioning away from PAID
      // Reversing the ledger decrement is out of scope for now.
      if (disbursement.status === DisbursementStatus.PAID && newStatus !== DisbursementStatus.PAID) {
        throw new BadRequestException(
          'V1 Limitation: Reversing a PAID disbursement (and its ledger impact) is currently not supported.'
        );
      }

      // 1. If marking PAID, enforce overpayment check again (in case called directly)
      if (newStatus === DisbursementStatus.PAID) {
        // Must lock the lease first to avoid race conditions if this was called standalone
        await t.$queryRaw`SELECT 1 FROM "Lease" WHERE id = ${disbursement.leaseId} FOR UPDATE`;
        
        const currentlyOwed = await this.computeLandlordAmountOwed(disbursement.leaseId, t);
        if (disbursement.amount.greaterThan(currentlyOwed)) {
          throw new BadRequestException(
            `Cannot mark disbursement PAID for ${disbursement.amount.toString()}. Landlord is only owed ${currentlyOwed.toString()}.`
          );
        }
      }

      // 2. Update the status
      const updated = await t.disbursement.update({
        where: { id: disbursementId },
        data: { status: newStatus },
      });

      // 3. If transitioning to PAID, decrease TRUST ledger balance
      if (newStatus === DisbursementStatus.PAID) {
        const trustLedger = await this.ledgerService.getLedger(updated.leaseId, LedgerType.TRUST, t);

        // Defense-in-depth: Never disburse more cash than is actually sitting in the TRUST ledger
        if (trustLedger.runningBalance.lessThan(updated.amount)) {
          throw new BadRequestException(
            `Insufficient funds in TRUST ledger. Attempted to disburse ${updated.amount.toString()}, but only ${trustLedger.runningBalance.toString()} is available.`
          );
        }

        // Negative delta because money is leaving the company's trust account
        const delta = updated.amount.negated();

        await this.ledgerService.updateBalance(
          {
            ledgerId: trustLedger.id,
            amountDelta: delta,
            triggerEventType: LedgerTriggerEvent.DISBURSEMENT,
            triggerEventId: updated.id,
          },
          t,
        );
      }

      return updated;
    };

    return tx ? runTx(tx) : this.prisma.$transaction(runTx);
  }
}
