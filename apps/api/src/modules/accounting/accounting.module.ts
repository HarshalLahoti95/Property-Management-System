import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingRepository } from './accounting.repository';
import { BillingSchedulerService } from './billing-scheduler.service';
import { LedgerReconciliationJob } from './jobs/ledger-reconciliation.job';
import { ChargeService } from './charge.service';
import { LedgerService } from './ledger.service';
import { MaintenanceDeductionService } from './maintenance-deduction.service';
import { MaintenanceDeductionController } from './maintenance-deduction.controller';

@Module({
  controllers: [AccountingController, MaintenanceDeductionController],
  providers: [
    AccountingService,
    AccountingRepository,
    BillingSchedulerService,
    LedgerReconciliationJob,
    ChargeService,
    LedgerService,
    MaintenanceDeductionService,
  ],
  exports: [
    AccountingService,
    AccountingRepository,
    BillingSchedulerService,
    LedgerReconciliationJob,
    ChargeService,
    LedgerService,
    MaintenanceDeductionService,
  ],
})
export class AccountingModule {}
