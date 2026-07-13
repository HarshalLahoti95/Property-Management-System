import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { VendorRepository } from './vendor.repository';

@Module({
  controllers: [VendorController],
  providers: [VendorService, VendorRepository],
  exports: [VendorService, VendorRepository],
})
export class VendorModule {}
