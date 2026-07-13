import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import { Unit, UnitOccupancyStatus } from '@prisma/client';

@Injectable()
export class UnitRepository extends BaseRepository<Unit> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'unit');
  }

  async findActiveManyByPropertyId(params: {
    propertyId: string;
    skip: number;
    take: number;
    status?: UnitOccupancyStatus;
    landlordId?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<Unit[]> {
    const where: any = {
      propertyId: params.propertyId,
      deletedAt: null,
    };
    if (params.status) {
      where.occupancyStatus = params.status;
    }
    if (params.landlordId) {
      where.landlordId = params.landlordId;
    }

    return this.prisma.unit.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { [params.sortBy]: params.sortOrder },
      include: {
        property: true,
      },
    });
  }

  async countActive(params: {
    propertyId: string;
    status?: UnitOccupancyStatus;
    landlordId?: string;
  }): Promise<number> {
    const where: any = {
      propertyId: params.propertyId,
      deletedAt: null,
    };
    if (params.status) {
      where.occupancyStatus = params.status;
    }
    if (params.landlordId) {
      where.landlordId = params.landlordId;
    }

    return this.prisma.unit.count({ where });
  }

  async findActiveById(id: string): Promise<Unit | null> {
    return this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: { property: true },
    });
  }

  async softDelete(id: string): Promise<Unit> {
    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
