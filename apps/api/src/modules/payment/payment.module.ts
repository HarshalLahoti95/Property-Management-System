import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { AccountingModule } from '../accounting/accounting.module';
import { AllocationService } from './allocation.service';

@Module({
  imports: [forwardRef(() => AccountingModule)],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepository, AllocationService],
  exports: [PaymentService, PaymentRepository, AllocationService],
})
export class PaymentModule {}
