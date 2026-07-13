import { Module } from '@nestjs/common';
import { LeaseController } from './lease.controller';
import { LeaseService } from './lease.service';
import { LeaseStatusService } from './lease-status.service';
import { LeaseRepository } from './lease.repository';
import { LeaseTemplateService } from './services/template.service';
import { LeaseExpirySchedulerService } from './services/lease-expiry-scheduler.service';
import { LeaseDocumentGeneratorService } from './services/lease-document-generator.service';
import { AuthModule } from '../auth/auth.module';
import { AccountingModule } from '../accounting/accounting.module';
import { DocumentModule } from '../document/document.module';

@Module({
  imports: [AuthModule, AccountingModule, DocumentModule],
  controllers: [LeaseController],
  providers: [LeaseService, LeaseStatusService, LeaseRepository, LeaseTemplateService, LeaseExpirySchedulerService, LeaseDocumentGeneratorService],
  exports: [LeaseService, LeaseStatusService, LeaseRepository, LeaseTemplateService, LeaseExpirySchedulerService, LeaseDocumentGeneratorService],
})
export class LeaseModule {}
