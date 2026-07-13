import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { LeaseRepository } from './lease.repository';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { LeaseQueryDto } from './dto/lease-query.dto';
import { PrismaService } from '../../database/prisma.service';
import { Lease, LeaseStatus, UserRole } from '@prisma/client';
import { AccountingService } from '../accounting/accounting.service';
import { NotificationEventBus } from '../notification/notification.service';
import { LeaseStatusService } from './lease-status.service';
import { LeaseDocumentGeneratorService } from './services/lease-document-generator.service';
import { LeaseDocumentPurpose } from '@prisma/client';

@Injectable()
export class LeaseService {
  constructor(
    private readonly leaseRepository: LeaseRepository,
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
    private readonly eventBus: NotificationEventBus,
    private readonly leaseStatusService: LeaseStatusService,
    private readonly leaseDocumentGeneratorService: LeaseDocumentGeneratorService,
  ) {}

  /**
   * Reusable helper to validate existence and landlord ownership check on a specific Lease.
   */
  private async validateLeaseAccess(id: string, user: { id: string; role: string }): Promise<Lease> {
    const lease = await this.leaseRepository.findActiveById(id);
    if (!lease) {
      throw new NotFoundException(`Lease with ID ${id} not found.`);
    }

    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    const landlordIdOfUnit = (lease as any).unit?.landlordId;
    if (normalizedRole === 'LANDLORD' && landlordIdOfUnit !== user.id) {
      throw new ForbiddenException('You do not have permission to manage this lease.');
    }

    if (normalizedRole === 'TENANT') {
      const isTenantOnLease = (lease as any).leaseTenants?.some((lt: any) => lt.tenantId === user.id);
      if (!isTenantOnLease) {
        throw new ForbiddenException('You do not have permission to view this lease.');
      }
    }

    return lease;
  }

  /**
   * Reusable helper to validate existence and landlord ownership check on a target Unit.
   */
  private async validateUnitAccess(unitId: string, user: { id: string; role: string }) {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, deletedAt: null },
      include: { property: true },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found.`);
    }

    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    if (normalizedRole === 'LANDLORD' && unit.landlordId !== user.id) {
      throw new ForbiddenException('You do not have permission to manage leases under this unit.');
    }

    return unit;
  }

  /**
   * Reusable helper to validate that target user IDs represent active tenant roles.
   */
  private async validateTenants(tenantIds: string[]): Promise<void> {
    if (!tenantIds || tenantIds.length === 0) {
      throw new BadRequestException('Lease must be associated with at least one tenant.');
    }

    const tenants = await this.prisma.user.findMany({
      where: {
        id: { in: tenantIds },
        role: 'TENANT',
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (tenants.length !== tenantIds.length) {
      throw new BadRequestException('One or more tenant IDs are invalid, inactive, or do not have the TENANT role.');
    }
  }

  /**
   * Registers a new Lease (starts as DRAFT) and links associated LeaseTenant users inside a transaction.
   */
  async create(dto: CreateLeaseDto, user: { id: string; role: string }): Promise<Lease> {
    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';

    if (normalizedRole === 'TENANT') {
      throw new ForbiddenException('Tenants are not allowed to create leases.');
    }
    await this.validateUnitAccess(dto.unitId, user);
    await this.validateTenants(dto.tenantIds);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException('End date must be strictly after start date.');
    }

    const lease = await this.leaseStatusService.createDraft({
      unitId: dto.unitId,
      startDate: start,
      endDate: end,
      monthlyRent: dto.monthlyRent,
      securityDeposit: dto.securityDeposit,
      rentDueDay: dto.rentDueDay,
      gracePeriodDays: dto.gracePeriodDays,
      tenantIds: dto.tenantIds,
    }, user);

    if (normalizedRole === 'ADMIN') {
      return this.leaseStatusService.submitForLandlordApproval(lease.id, user);
    }

    return lease;
  }

  /**
   * Lists paginated and scoped active leases matching filter constraints.
   */
  async findAll(
    query: LeaseQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: Lease[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const userRole = Array.isArray(user?.role) ? user.role[0] : user?.role;
    const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase().trim() : '';
    
    const landlordId = normalizedRole === 'LANDLORD' ? user.id : undefined;
    const tenantId = normalizedRole === 'TENANT' ? user.id : undefined;
    const skip = (query.page - 1) * query.limit;

    const [data, total] = await Promise.all([
      this.leaseRepository.findActiveMany({
        skip,
        take: query.limit,
        status: query.status,
        unitId: query.unitId,
        landlordId,
        tenantId,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      this.leaseRepository.countActive({
        status: query.status,
        unitId: query.unitId,
        landlordId,
        tenantId,
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
   * Retrieves detail of an active lease after verifying access.
   */
  async findOne(id: string, user: { id: string; role: string }): Promise<Lease> {
    return this.validateLeaseAccess(id, user);
  }

  /**
   * Retrieves all documents associated with a lease.
   */
  async getDocuments(id: string, user: { id: string; role: string }) {
    await this.validateLeaseAccess(id, user);

    const leaseDocuments = await this.prisma.leaseDocument.findMany({
      where: { leaseId: id },
      include: { document: true },
      orderBy: [{ purpose: 'asc' }, { createdAt: 'desc' }],
    });

    return leaseDocuments.map((ld) => ({
      purpose: ld.purpose,
      id: ld.document.id,
      fileName: ld.document.fileName,
      createdAt: ld.document.createdAt,
      downloadUrl: `/api/documents/${ld.document.id}/stream`,
    }));
  }

  /**
   * Updates details of a draft or pending-landlord-approval lease and synchronizes tenant arrays in a transaction.
   */
  async update(id: string, dto: UpdateLeaseDto, user: { id: string; role: string }): Promise<Lease & { documentGenerationWarning?: string }> {
    const lease = await this.validateLeaseAccess(id, user);

    if (lease.status !== LeaseStatus.DRAFT && lease.status !== LeaseStatus.PENDING_LANDLORD_APPROVAL) {
      throw new BadRequestException('Cannot modify lease fields once it has progressed past landlord approval.');
    }

    const updateData: any = {};
    if (dto.unitId !== undefined) {
      await this.validateUnitAccess(dto.unitId, user);
      updateData.unitId = dto.unitId;
    }
    if (dto.tenantIds !== undefined) {
      await this.validateTenants(dto.tenantIds);
    }
    if (dto.monthlyRent !== undefined) updateData.monthlyRent = dto.monthlyRent;
    if (dto.securityDeposit !== undefined) updateData.securityDeposit = dto.securityDeposit;
    if (dto.rentDueDay !== undefined) updateData.rentDueDay = dto.rentDueDay;
    if (dto.gracePeriodDays !== undefined) updateData.gracePeriodDays = dto.gracePeriodDays;

    const start = dto.startDate ? new Date(dto.startDate) : new Date(lease.startDate);
    const end = dto.endDate ? new Date(dto.endDate) : new Date(lease.endDate);
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      if (end <= start) {
        throw new BadRequestException('End date must be strictly after start date.');
      }
      updateData.startDate = start;
      updateData.endDate = end;
    }

    const updatedLease = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.lease.update({
        where: { id },
        data: updateData,
      });

      if (dto.tenantIds !== undefined) {
        await tx.leaseTenant.deleteMany({ where: { leaseId: id } });
        await Promise.all(
          dto.tenantIds.map((tenantId) =>
            tx.leaseTenant.create({
              data: {
                leaseId: id,
                tenantId,
                status: 'ACTIVE',
              },
            }),
          ),
        );
      }

      return updated;
    });

    try {
      await this.leaseDocumentGeneratorService.generateDocument(
        id,
        LeaseDocumentPurpose.DRAFT_PREVIEW,
        user
      );
    } catch (err) {
      // Add a transient warning flag so frontend knows the edit succeeded but PDF is stale
      (updatedLease as any).documentGenerationWarning = 'The fields were saved, but PDF regeneration failed. Please click Save again.';
    }

    return updatedLease;
  }

}
