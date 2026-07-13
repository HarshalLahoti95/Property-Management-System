import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UnitRepository } from './unit.repository';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitQueryDto } from './dto/unit-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { Unit, UserRole } from '@prisma/client';

@Injectable()
export class UnitService {
  constructor(
    private readonly unitRepository: UnitRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Reusable helper to validate target property existence and landlord ownership boundary.
   */
  private async validatePropertyAccess(propertyId: string, user: { id: string; role: string }): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found.`);
    }

    if (property.layout === 'STANDALONE') {
      const activeUnitCount = await this.prisma.unit.count({
        where: { propertyId, deletedAt: null }
      });
      if (activeUnitCount >= 1) {
        throw new BadRequestException('Cannot add additional units to a standalone property.');
      }
    }

    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    if (normalizedRole === 'LANDLORD') {
      const landlordUnitsInProperty = await this.prisma.unit.count({
        where: { propertyId, landlordId: user.id, deletedAt: null }
      });
      const totalUnitsInProperty = await this.prisma.unit.count({
        where: { propertyId, deletedAt: null }
      });
      // Allow if they already own units here, OR if the property has NO units yet (brand new property creation flow).
      if (landlordUnitsInProperty === 0 && totalUnitsInProperty > 0) {
        throw new ForbiddenException('You do not have permission to manage units under this property. You must own at least one unit in this property.');
      }
    }
  }

  /**
   * Reusable helper to validate unit existence and landlord ownership boundary.
   */
  private async validateUnitAccess(id: string, user: { id: string; role: string }): Promise<Unit> {
    const unit = await this.unitRepository.findActiveById(id);
    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found.`);
    }

    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    if (normalizedRole === 'LANDLORD' && unit.landlordId !== user.id) {
      throw new ForbiddenException('You do not have permission to manage this unit.');
    }

    return unit;
  }

  /**
   * Create a new unit under a property after verifying access.
   */
  async create(propertyId: string, dto: CreateUnitDto, user: { id: string; role: string }): Promise<Unit> {
    await this.validatePropertyAccess(propertyId, user);

    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    let landlordId = user.id;
    if (normalizedRole === 'ADMIN') {
      if (!dto.landlordId) {
        throw new ForbiddenException('Admin must specify a landlordId when creating a unit.');
      }
      landlordId = dto.landlordId;
    }

    return this.unitRepository.create({
      propertyId,
      landlordId,
      unitNumber: dto.unitNumber,
      floorLevel: dto.floor,
      bedCount: dto.bedrooms,
      bathCount: dto.bathrooms,
      squareFootage: dto.squareFootage,
      targetRent: dto.defaultRent,
      occupancyStatus: dto.status,
    });
  }

  /**
   * Search, filter, and list paginated units under a property after verifying access.
   */
  async findAll(
    propertyId: string,
    query: UnitQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: Unit[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.validatePropertyAccess(propertyId, user);
    const skip = (query.page - 1) * query.limit;
    
    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';
    const landlordId = normalizedRole === 'LANDLORD' ? user.id : undefined;

    const [data, total] = await Promise.all([
      this.unitRepository.findActiveManyByPropertyId({
        propertyId,
        skip,
        take: query.limit,
        status: query.status,
        landlordId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      this.unitRepository.countActive({
        propertyId,
        status: query.status,
        landlordId,
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  /**
   * Fetch details of a single unit after verifying access.
   */
  async findOne(id: string, user: { id: string; role: string }): Promise<Unit> {
    return this.validateUnitAccess(id, user);
  }

  /**
   * Update details of a unit after verifying access.
   */
  async update(id: string, dto: UpdateUnitDto, user: { id: string; role: string }): Promise<Unit> {
    await this.validateUnitAccess(id, user);

    const updateData: any = {};
    if (dto.unitNumber !== undefined) updateData.unitNumber = dto.unitNumber;
    if (dto.floor !== undefined) updateData.floorLevel = dto.floor;
    if (dto.bedrooms !== undefined) updateData.bedCount = dto.bedrooms;
    if (dto.bathrooms !== undefined) updateData.bathCount = dto.bathrooms;
    if (dto.squareFootage !== undefined) updateData.squareFootage = dto.squareFootage;
    if (dto.defaultRent !== undefined) updateData.targetRent = dto.defaultRent;
    if (dto.status !== undefined) updateData.occupancyStatus = dto.status;

    return this.unitRepository.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Request soft-delete a unit.
   * Sets the deletionStatus pending approval based on user role.
   */
  async remove(id: string, user: { id: string; role: string }): Promise<Unit> {
    await this.validateUnitAccess(id, user);
    
    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    const targetStatus = normalizedRole === 'LANDLORD' ? 'PENDING_ADMIN_APPROVAL' : 'PENDING_LANDLORD_APPROVAL';
    
    return this.prisma.unit.update({
      where: { id },
      data: {
        deletionStatus: targetStatus,
        deletionRequestedByRole: user.role as UserRole,
      },
    }) as any;
  }

  /**
   * Approve unit deletion request.
   */
  async approveDeletion(id: string, user: { id: string; role: string }): Promise<Unit> {
    const unit = await this.validateUnitAccess(id, user);
    
    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    if (normalizedRole === 'ADMIN' && unit.deletionStatus !== 'PENDING_ADMIN_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Admin to approve.');
    }
    if (normalizedRole === 'LANDLORD' && unit.deletionStatus !== 'PENDING_LANDLORD_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Landlord to approve.');
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        deletionStatus: 'APPROVED',
        deletedAt: new Date(),
      },
    }) as any;
  }

  /**
   * Reject unit deletion request.
   */
  async rejectDeletion(id: string, user: { id: string; role: string }): Promise<Unit> {
    const unit = await this.validateUnitAccess(id, user);
    
    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    if (normalizedRole === 'ADMIN' && unit.deletionStatus !== 'PENDING_ADMIN_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Admin to reject.');
    }
    if (normalizedRole === 'LANDLORD' && unit.deletionStatus !== 'PENDING_LANDLORD_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Landlord to reject.');
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        deletionStatus: 'REJECTED',
      },
    }) as any;
  }
}
