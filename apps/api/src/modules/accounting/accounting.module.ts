import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingRepository } from './accounting.repository';
import { BillingSchedulerService } from './billing-scheduler.service';
import { LedgerReconciliationJob } from './jobs/ledger-reconciliation.job';
import { ChargeService } from './charge.service';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [AccountingController],
  providers: [
    AccountingService,
    AccountingRepository,
    BillingSchedulerService,
    LedgerReconciliationJob,
    ChargeService,
    LedgerService,
  ],
  exports: [
    AccountingService,
    AccountingRepository,
    BillingSchedulerService,
    LedgerReconciliationJob,
    ChargeService,
    LedgerService,
  ],
})
export class AccountingModule {}
