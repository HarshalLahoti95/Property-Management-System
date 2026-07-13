import { Injectable, NotImplementedException } from '@nestjs/common';
import { AdminRepository } from './admin.repository';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async findAll(): Promise<any[]> {
    throw new NotImplementedException('Method not implemented');
  }

  async create(data: any): Promise<any> {
    throw new NotImplementedException('Method not implemented');
  }
}
