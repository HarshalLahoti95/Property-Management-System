import { Module } from '@nestjs/common';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';
import { UnitRepository } from './unit.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UnitController],
  providers: [UnitService, UnitRepository],
  exports: [UnitService, UnitRepository],
})
export class UnitModule {}
