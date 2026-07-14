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

@Module({
  imports: [forwardRef(() => AccountingModule)],
  controllers: [PaymentController, DisbursementController, TerminationDashboardController],
  providers: [PaymentService, PaymentRepository, AllocationService, DisbursementService, DepositReturnService, TerminationDashboardService],
  exports: [PaymentService, PaymentRepository, AllocationService, DisbursementService, DepositReturnService],
})
export class PaymentModule {}
