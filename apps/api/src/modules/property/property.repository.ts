import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import { Property, PropertyType } from '@prisma/client';

@Injectable()
export class PropertyRepository extends BaseRepository<Property> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'property');
  }

  async findActiveMany(params: {
    skip: number;
    take: number;
    search?: string;
    type?: PropertyType;
    landlordId?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<Property[]> {
    const where: any = { deletedAt: null };
    if (params.landlordId) {
      where.units = { some: { landlordId: params.landlordId, deletedAt: null } };
    }
    if (params.type) {
      where.type = params.type;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { streetAddress: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.property.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { [params.sortBy]: params.sortOrder },
      include: {
        units: {
          where: { deletedAt: null },
        },
      },
    });
  }

  async findAllGroupedByLandlord(): Promise<any[]> {
    // A single property might contain units from multiple landlords.
    // Therefore, we fetch distinct landlords and their units (with properties)
    const users = await this.prisma.user.findMany({
      where: {
        role: 'LANDLORD',
        units: { some: { deletedAt: null } }
      },
      include: {
        units: {
          where: { deletedAt: null },
          include: {
            property: true
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    return users.map(user => {
      // Re-group units by property for this landlord
      const propertiesMap = new Map<string, any>();
      for (const unit of user.units) {
        if (!propertiesMap.has(unit.propertyId)) {
          propertiesMap.set(unit.propertyId, {
            ...unit.property,
            units: []
          });
        }
        propertiesMap.get(unit.propertyId).units.push(unit);
      }

      return {
        landlordId: user.id,
        landlord: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
        properties: Array.from(propertiesMap.values())
      };
    });
  }

  async countActive(params: {
    search?: string;
    type?: PropertyType;
    landlordId?: string;
  }): Promise<number> {
    const where: any = { deletedAt: null };
    if (params.landlordId) {
      where.units = { some: { landlordId: params.landlordId, deletedAt: null } };
    }
    if (params.type) {
      where.type = params.type;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { streetAddress: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.property.count({ where });
  }

  async findActiveById(id: string): Promise<Property | null> {
    return this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: { units: true },
    });
  }

  async softDelete(id: string): Promise<Property> {
    return this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getDashboardMetrics(id: string) {
    const totalUnits = await this.prisma.unit.count({
      where: { propertyId: id, deletedAt: null },
    });

    const occupiedUnits = await this.prisma.unit.count({
      where: { propertyId: id, occupancyStatus: 'OCCUPIED', deletedAt: null },
    });

    const openWorkOrders = await this.prisma.workOrder.count({
      where: {
        propertyId: id,
        status: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] },
        deletedAt: null,
      },
    });

    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0.0;

    return {
      totalUnits,
      occupiedUnits,
      occupancyRate: parseFloat(occupancyRate.toFixed(2)),
      openWorkOrders,
    };
  }
}
