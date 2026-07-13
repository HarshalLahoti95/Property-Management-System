import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import { Lease, LeaseStatus, UserRole } from '@prisma/client';

@Injectable()
export class LeaseRepository extends BaseRepository<Lease> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'lease');
  }



  /**
   * Retrieves a specific active lease with all relations.
   * Landlord is derived from unit.landlordId.
   */
  async findActiveById(id: string): Promise<Lease | null> {
    return this.prisma.lease.findFirst({
      where: { id, deletedAt: null },
      include: {
        unit: {
          include: {
            landlord: true,
            property: true,
          },
        },
        leaseTenants: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves paginated, sorted, and filtered active leases.
   * Landlord filtering is done via unit.landlordId.
   */
  async findActiveMany(params: {
    skip: number;
    take: number;
    status?: LeaseStatus;
    unitId?: string;
    landlordId?: string;
    tenantId?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<Lease[]> {
    const where: any = { deletedAt: null };
    if (params.status) {
      where.status = params.status;
    }
    if (params.unitId) {
      where.unitId = params.unitId;
    }
    if (params.landlordId) {
      where.unit = {
        landlordId: params.landlordId,
      };
    }
    if (params.tenantId) {
      where.leaseTenants = {
        some: { tenantId: params.tenantId },
      };
    }

    return this.prisma.lease.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { [params.sortBy]: params.sortOrder },
      include: {
        unit: {
          include: {
            property: true,
            landlord: true,
          },
        },
        leaseTenants: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  /**
   * Counts active leases matching filter criteria.
   * Landlord filtering is done via unit.landlordId.
   */
  async countActive(params: {
    status?: LeaseStatus;
    unitId?: string;
    landlordId?: string;
    tenantId?: string;
  }): Promise<number> {
    const where: any = { deletedAt: null };
    if (params.status) {
      where.status = params.status;
    }
    if (params.unitId) {
      where.unitId = params.unitId;
    }
    if (params.landlordId) {
      where.unit = {
        landlordId: params.landlordId,
      };
    }
    if (params.tenantId) {
      where.leaseTenants = {
        some: { tenantId: params.tenantId },
      };
    }

    return this.prisma.lease.count({ where });
  }

  /**
   * Soft-deletes a lease by marking its deletedAt timestamp.
   */
  async softDelete(id: string): Promise<Lease> {
    return this.prisma.lease.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Updates lease status, logs transition audit history, and updates occupancy in a transaction.
   */
  async updateStatusWithHistory(
    id: string,
    params: {
      oldStatus: LeaseStatus;
      newStatus: LeaseStatus;
      changedByUserId: string;
      reasonDescription?: string;
    },
  ): Promise<Lease> {
    return this.prisma.$transaction(async (tx) => {
      const lease = await tx.lease.findFirst({
        where: { id, deletedAt: null },
        include: { unit: true },
      });
      if (!lease) {
        throw new NotFoundException(`Lease with ID ${id} not found.`);
      }

      // Check overlap concurrency rules if moving to ACTIVE
      if (params.newStatus === LeaseStatus.ACTIVE) {
        const overlap = await tx.lease.findFirst({
          where: {
            unitId: lease.unitId,
            status: LeaseStatus.ACTIVE,
            deletedAt: null,
            id: { not: id },
            OR: [
              {
                startDate: { lte: lease.endDate },
                endDate: { gte: lease.startDate },
              },
            ],
          },
        });
        if (overlap) {
          throw new BadRequestException('Cannot activate lease. There is an overlapping active lease for this unit.');
        }

        // Update parent unit occupancyStatus to OCCUPIED
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { occupancyStatus: 'OCCUPIED' },
        });
      }

      // Update unit back to VACANT if lease terminates or expires
      if (params.newStatus === LeaseStatus.TERMINATED || params.newStatus === LeaseStatus.EXPIRED) {
        await tx.unit.update({
          where: { id: lease.unitId },
          data: { occupancyStatus: 'VACANT' },
        });
      }

      // Update lease status
      const updated = await tx.lease.update({
        where: { id },
        data: { status: params.newStatus },
      });

      // Create history record
      await tx.leaseStatusHistory.create({
        data: {
          leaseId: id,
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
          changedByUserId: params.changedByUserId,
          reasonDescription: params.reasonDescription,
        },
      });

      return updated;
    });
  }
}
