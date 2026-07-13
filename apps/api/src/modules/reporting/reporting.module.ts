import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ReportingRepository } from './reporting.repository';
import { CacheService } from './services/cache.service';
import { MaintenanceModule } from '../maintenance/maintenance.module';

@Module({
  imports: [MaintenanceModule],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingRepository, CacheService],
  exports: [ReportingService, ReportingRepository],
})
export class ReportingModule {}
