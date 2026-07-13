import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingRepository } from './accounting.repository';
import { BillingSchedulerService } from './billing-scheduler.service';
import { LedgerReconciliationJob } from './jobs/ledger-reconciliation.job';

@Module({
  controllers: [AccountingController],
  providers: [
    AccountingService,
    AccountingRepository,
    BillingSchedulerService,
    LedgerReconciliationJob,
  ],
  exports: [
    AccountingService,
    AccountingRepository,
    BillingSchedulerService,
    LedgerReconciliationJob,
  ],
})
export class AccountingModule {}
