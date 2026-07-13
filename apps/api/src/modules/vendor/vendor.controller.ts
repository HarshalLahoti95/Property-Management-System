import { Controller, Get, Post, NotImplementedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VendorService } from './vendor.service';

@ApiTags('Vendor')
@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  async findAll() {
    throw new NotImplementedException('Method not implemented');
  }

  @Post()
  async create() {
    throw new NotImplementedException('Method not implemented');
  }
}
