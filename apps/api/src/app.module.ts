import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Global Modules
import { CoreModule } from './core/core.module';
import { DatabaseModule } from './database/database.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { PropertyModule } from './modules/property/property.module';
import { UnitModule } from './modules/unit/unit.module';
import { LeaseModule } from './modules/lease/lease.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PaymentModule } from './modules/payment/payment.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { DocumentModule } from './modules/document/document.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { AdminModule } from './modules/admin/admin.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    AuthModule,
    PropertyModule,
    UnitModule,
    LeaseModule,
    AccountingModule,
    PaymentModule,
    MaintenanceModule,
    VendorModule,
    DocumentModule,
    NotificationModule,
    ReportingModule,
    AdminModule,
    UserModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
