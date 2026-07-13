import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PropertyRepository } from './property.repository';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { Property, PropertyType, PropertyLayout, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PropertyService {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Reusable helper method to validate property existence and ownership/access boundary.
   * Admins bypass ownership checks; Landlords are strictly validated.
   */
  private async validateOwnership(id: string, user: { id: string; role: string }): Promise<Property> {
    const property = await this.propertyRepository.findActiveById(id);
    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found.`);
    }

    if (user.role === UserRole.LANDLORD && !(property as any).units?.some((u: any) => u.landlordId === user.id)) {
      throw new ForbiddenException('You do not have permission to access this property. You must own at least one unit in this property.');
    }

    return property;
  }

  /**
   * Create a new property associated with the authenticated landlord or target landlordId (Admin only).
   */
  async create(dto: CreatePropertyDto, user: { id: string; role: string }): Promise<Property> {
    let landlordId = user.id;

    if (user.role === UserRole.ADMIN && dto.landlordId) {
      landlordId = dto.landlordId;
    }

    if (dto.layout === PropertyLayout.STANDALONE && dto.units && dto.units.length > 1) {
      throw new BadRequestException('A standalone property can only have a maximum of one unit.');
    }

    try {
      return await this.propertyRepository.create({
        name: dto.name,
        type: dto.type,
        layout: dto.layout,
        streetAddress: dto.streetAddress,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        ...(dto.units && dto.units.length > 0 && { 
          units: { 
            create: dto.units.map(u => ({
              landlordId, // Add landlordId to the unit
              unitNumber: u.unitNumber,
              floorLevel: u.floor,
              bedCount: u.bedrooms,
              bathCount: u.bathrooms,
              squareFootage: u.squareFootage,
              targetRent: u.defaultRent,
              occupancyStatus: u.status,
            }))
          } 
        })
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('A property with this exact address already exists.');
      }
      throw error;
    }
  }

  /**
   * Search, filter, and paginate properties scoped to the authenticated caller's landlord context.
   */
  async findAll(
    query: PropertyQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: Property[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';
    
    const landlordId = normalizedRole === 'LANDLORD' ? user.id : undefined;
    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.propertyRepository.findActiveMany({
        skip,
        take: query.limit,
        search: query.search,
        type: query.type,
        landlordId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      this.propertyRepository.countActive({
        search: query.search,
        type: query.type,
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
   * Retrieve active properties grouped by landlord (Admin only).
   */
  async findAllGroupedByLandlord(user: { id: string; role: string }): Promise<any[]> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can access properties grouped by landlord.');
    }
    return this.propertyRepository.findAllGroupedByLandlord();
  }

  /**
   * Retrieve details of a specific active property.
   */
  async findOne(id: string, user: { id: string; role: string }): Promise<Property> {
    return this.validateOwnership(id, user);
  }

  /**
   * Update details of an active property.
   */
  async update(id: string, dto: UpdatePropertyDto, user: { id: string; role: string }): Promise<Property> {
    await this.validateOwnership(id, user);
    
    const { units, ...rest } = dto;
    let landlordId = user.id;
    if (user.role === UserRole.ADMIN && dto.landlordId) {
      landlordId = dto.landlordId;
    }

    if (dto.layout === PropertyLayout.STANDALONE && units && units.length > 1) {
      throw new BadRequestException('A standalone property can only have a maximum of one unit.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update property details
      await tx.property.update({
        where: { id },
        data: rest as any,
      });

      if (units) {
        const activeUnits: string[] = [];

        for (const u of units) {
          const unitData = {
            unitNumber: u.unitNumber,
            floorLevel: u.floor,
            bedCount: u.bedrooms,
            bathCount: u.bathrooms,
            squareFootage: u.squareFootage,
            targetRent: u.defaultRent,
            occupancyStatus: u.status,
          };

          let updatedUnit;
          if (u.id) {
            updatedUnit = await tx.unit.update({
              where: { id: u.id },
              data: unitData,
            });
          } else {
            const existingUnit = await tx.unit.findFirst({
              where: {
                propertyId: id,
                unitNumber: u.unitNumber,
                deletedAt: null,
              },
            });

            if (existingUnit) {
              updatedUnit = await tx.unit.update({
                where: { id: existingUnit.id },
                data: unitData,
              });
            } else {
              updatedUnit = await tx.unit.create({
                data: {
                  ...unitData,
                  propertyId: id,
                  landlordId,
                },
              });
            }
          }
          activeUnits.push(updatedUnit.id);
        }

        // Soft delete units that are no longer in the request payload by requesting deletion
        const targetUnitStatus = user.role === UserRole.LANDLORD ? 'PENDING_ADMIN_APPROVAL' : 'PENDING_LANDLORD_APPROVAL';
        
        await tx.unit.updateMany({
          where: {
            propertyId: id,
            id: { notIn: activeUnits },
            deletedAt: null,
            deletionStatus: null, // Only target units not already pending deletion
          },
          data: {
            deletionStatus: targetUnitStatus,
            deletionRequestedByRole: user.role as UserRole,
          },
        });
      }

      return tx.property.findUnique({
        where: { id },
        include: {
          units: {
            where: { deletedAt: null },
          },
        },
      }) as any;
    });
  }

  /**
   * Request soft-delete a property. 
   * Sets the deletionStatus pending approval based on user role.
   */
  async remove(id: string, user: { id: string; role: string }): Promise<Property> {
    await this.validateOwnership(id, user);
    const targetStatus = user.role === UserRole.LANDLORD ? 'PENDING_ADMIN_APPROVAL' : 'PENDING_LANDLORD_APPROVAL';
    
    return this.prisma.property.update({
      where: { id },
      data: {
        deletionStatus: targetStatus,
        deletionRequestedByRole: user.role as UserRole,
      },
    }) as any;
  }

  /**
   * Approve property deletion request.
   */
  async approveDeletion(id: string, user: { id: string; role: string }): Promise<Property> {
    const property = await this.validateOwnership(id, user);
    
    if (user.role === UserRole.ADMIN && property.deletionStatus !== 'PENDING_ADMIN_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Admin to approve.');
    }
    if (user.role === UserRole.LANDLORD && property.deletionStatus !== 'PENDING_LANDLORD_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Landlord to approve.');
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        deletionStatus: 'APPROVED',
        deletedAt: new Date(),
      },
    }) as any;
  }

  /**
   * Reject property deletion request.
   */
  async rejectDeletion(id: string, user: { id: string; role: string }): Promise<Property> {
    const property = await this.validateOwnership(id, user);
    
    if (user.role === UserRole.ADMIN && property.deletionStatus !== 'PENDING_ADMIN_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Admin to reject.');
    }
    if (user.role === UserRole.LANDLORD && property.deletionStatus !== 'PENDING_LANDLORD_APPROVAL') {
      throw new BadRequestException('No pending deletion request for Landlord to reject.');
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        deletionStatus: 'REJECTED',
      },
    }) as any;
  }

  /**
   * Compute aggregated dashboard metrics for a property.
   */
  async getDashboard(
    id: string,
    user: { id: string; role: string },
  ): Promise<{
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
    openWorkOrders: number;
  }> {
    await this.validateOwnership(id, user);
    return this.propertyRepository.getDashboardMetrics(id);
  }
}
