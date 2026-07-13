import { Injectable, NotImplementedException } from '@nestjs/common';
import { VendorRepository } from './vendor.repository';

@Injectable()
export class VendorService {
  constructor(private readonly vendorRepository: VendorRepository) {}

  async findAll(): Promise<any[]> {
    throw new NotImplementedException('Method not implemented');
  }

  async create(data: any): Promise<any> {
    throw new NotImplementedException('Method not implemented');
  }
}
