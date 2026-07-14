import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { AccountingModule } from '../accounting/accounting.module';
import { AllocationService } from './allocation.service';
import { DisbursementController } from './disbursement.controller';
import { DisbursementService } from './disbursement.service';

@Module({
  imports: [forwardRef(() => AccountingModule)],
  controllers: [PaymentController, DisbursementController],
  providers: [PaymentService, PaymentRepository, AllocationService, DisbursementService],
  exports: [PaymentService, PaymentRepository, AllocationService, DisbursementService],
})
export class PaymentModule {}
