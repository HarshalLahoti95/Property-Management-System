import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthRepository extends BaseRepository<any> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'auth'); // Placeholder entity name
  }

  async findCustom(): Promise<any[]> {
    return [];
  }
}
