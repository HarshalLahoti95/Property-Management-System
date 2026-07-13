import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminRepository extends BaseRepository<any> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'admin'); // Placeholder entity name
  }

  async findCustom(): Promise<any[]> {
    return [];
  }
}
