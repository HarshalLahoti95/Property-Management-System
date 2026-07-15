import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { AccountingModule } from '../accounting/accounting.module';
import { AllocationService } from './allocation.service';
import { DisbursementController } from './disbursement.controller';
import { DisbursementService } from './disbursement.service';
import { DepositReturnService } from './deposit-return.service';
import { TerminationDashboardController } from './termination-dashboard.controller';
import { TerminationDashboardService } from './termination-dashboard.service';
import { PortfolioDashboardController } from './portfolio-dashboard.controller';
import { PortfolioDashboardService } from './portfolio-dashboard.service';
import { ReportingModule } from '../reporting/reporting.module';

@Module({
  imports: [forwardRef(() => AccountingModule), ReportingModule],
  controllers: [PaymentController, DisbursementController, TerminationDashboardController, PortfolioDashboardController],
  providers: [PaymentService, PaymentRepository, AllocationService, DisbursementService, DepositReturnService, TerminationDashboardService, PortfolioDashboardService],
  exports: [PaymentService, PaymentRepository, AllocationService, DisbursementService, DepositReturnService],
})
export class PaymentModule {}
