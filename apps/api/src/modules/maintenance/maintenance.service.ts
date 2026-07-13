import { Injectable, NotFoundException, ForbiddenException, BadRequestException, MethodNotAllowedException } from '@nestjs/common';
import { MaintenanceRepository } from './maintenance.repository';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { AssignVendorDto } from './dto/assign-vendor.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from '../../database/prisma.service';
import {
  WorkOrder,
  WorkOrderStatusHistory,
  WorkOrderComment,
  WorkOrderStatus,
  WorkOrderPriority,
  UserRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly maintenanceRepository: MaintenanceRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Submits/Registers a new maintenance work order.
   */
  async create(dto: CreateWorkOrderDto, user: { id: string; role: string }): Promise<WorkOrder> {
    // 1. Target Mutex: Exactly one target must be provided, never both
    if (dto.propertyId && dto.unitId) {
      throw new BadRequestException('Work order must reference exactly one target (Property OR Unit), never both.');
    }
    if (!dto.propertyId && !dto.unitId) {
      throw new BadRequestException('Work order must reference at least one target (Property OR Unit).');
    }

    let targetPropertyId = dto.propertyId;
    let targetUnitId = dto.unitId;

    if (targetUnitId) {
      // Verify unit exists and is active
      const unit = await this.prisma.unit.findFirst({
        where: { id: targetUnitId, deletedAt: null },
        include: { property: true },
      });
      if (!unit) {
        throw new NotFoundException(`Unit with ID ${targetUnitId} not found.`);
      }
      targetPropertyId = unit.propertyId;

      // Tenant authorization check
      if (user.role === UserRole.TENANT) {
        await this.validateTenantLease(targetUnitId, user.id);
      }
    } else if (targetPropertyId) {
      // Verify property exists and is active
      const property = await this.prisma.property.findFirst({
        where: { id: targetPropertyId, deletedAt: null },
      });
      if (!property) {
        throw new NotFoundException(`Property with ID ${targetPropertyId} not found.`);
      }

      // Tenants cannot file generic property-wide work orders (only for their leased units)
      if (user.role === UserRole.TENANT) {
        throw new ForbiddenException('Tenants are only authorized to submit work orders for their leased units.');
      }
    }

    // Landlord authorization check
    if (user.role === UserRole.LANDLORD) {
      if (targetUnitId) {
        const unit = await this.prisma.unit.findUnique({ where: { id: targetUnitId } });
        if (unit?.landlordId !== user.id) {
          throw new ForbiddenException('You do not have permission to submit work orders for this unit.');
        }
      } else if (targetPropertyId) {
        await this.validateLandlordOwnership(targetPropertyId, user.id);
      }
    }

    // Generate unique work order number
    const woNum = `WO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.$transaction(async (tx) => {
      // Create work order
      const workOrder = await tx.workOrder.create({
        data: {
          propertyId: targetPropertyId!,
          unitId: targetUnitId,
          workOrderNumber: woNum,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          status: WorkOrderStatus.SUBMITTED,
          estimatedCost: dto.estimatedCost ? new Prisma.Decimal(dto.estimatedCost) : null,
          targetCompletionDate: dto.targetCompletionDate ? new Date(dto.targetCompletionDate) : null,
        },
      });

      // Write initial history record
      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: workOrder.id,
          oldStatus: null,
          newStatus: WorkOrderStatus.SUBMITTED,
          changedByUserId: user.id,
          reasonDescription: 'Initial work order creation',
        },
      });

      return workOrder;
    });
  }

  /**
   * Retrieves detail of a work order.
   */
  async findOne(id: string, user: { id: string; role: string }): Promise<WorkOrder> {
    const workOrder = await this.maintenanceRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found.`);
    }

    await this.validateWorkOrderAccess(workOrder, user);
    return workOrder;
  }

  /**
   * Lists work orders with filtering.
   */
  async findAll(
    query: WorkOrderQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: WorkOrder[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (query.page - 1) * query.limit;
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;

    let tenantUnitId: string | undefined;
    if (user.role === UserRole.TENANT) {
      // Find the unit currently leased by this tenant
      const activeLease = await this.prisma.lease.findFirst({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          leaseTenants: {
            some: {
              tenantId: user.id,
              status: 'ACTIVE',
            },
          },
        },
        select: { unitId: true },
      });
      tenantUnitId = activeLease?.unitId || 'non-existent-uuid';
      
      // Override filters
      query.unitId = tenantUnitId;
      query.propertyId = undefined;
    }

    if (query.propertyId && user.role !== UserRole.TENANT) {
      await this.validateLandlordOwnership(query.propertyId, user.id);
    }

    const searchParams = {
      skip,
      take: query.limit,
      propertyId: query.propertyId,
      unitId: query.unitId,
      priority: query.priority,
      status: query.status,
      vendorId: query.vendorId,
      landlordId,
      tenantUnitId,
    };

    const [data, total] = await Promise.all([
      this.maintenanceRepository.findWorkOrders(searchParams),
      this.maintenanceRepository.countWorkOrders(searchParams),
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
   * Updates work order details (descriptions, priority, target dates, costs).
   */
  async update(
    id: string,
    dto: UpdateWorkOrderDto,
    user: { id: string; role: string },
  ): Promise<WorkOrder> {
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to update work order parameters.');
    }

    const workOrder = await this.maintenanceRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found.`);
    }

    await this.validateWorkOrderAccess(workOrder, user);

    // Validate closed work orders cannot be modified
    if (workOrder.status === WorkOrderStatus.RESOLVED || workOrder.status === WorkOrderStatus.CANCELLED) {
      throw new BadRequestException('Closed work orders cannot be modified.');
    }

    // Validate Cost Rules
    if (dto.estimatedCost !== undefined && dto.estimatedCost < 0) {
      throw new BadRequestException('Estimated cost must be non-negative.');
    }
    if (dto.actualCost !== undefined) {
      if (dto.actualCost < 0) {
        throw new BadRequestException('Actual cost must be non-negative.');
      }
      // Actual cost may only be recorded after work has begun
      const allowedStates: WorkOrderStatus[] = [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD, WorkOrderStatus.RESOLVED];
      if (!allowedStates.includes(workOrder.status)) {
        throw new BadRequestException('Actual cost can only be recorded after work has transitioned to IN_PROGRESS or ON_HOLD.');
      }
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.estimatedCost !== undefined) updateData.estimatedCost = new Prisma.Decimal(dto.estimatedCost);
    if (dto.actualCost !== undefined) updateData.actualCost = new Prisma.Decimal(dto.actualCost);
    if (dto.targetCompletionDate !== undefined) updateData.targetCompletionDate = new Date(dto.targetCompletionDate);
    if (dto.actualCompletionDate !== undefined) updateData.actualCompletionDate = new Date(dto.actualCompletionDate);

    return this.prisma.$transaction(async (tx) => {
      return tx.workOrder.update({
        where: { id },
        data: updateData,
      });
    });
  }

  /**
   * Handles work order status transitions with strict state machine checks.
   */
  async transition(
    id: string,
    dto: TransitionStatusDto,
    user: { id: string; role: string },
  ): Promise<WorkOrder> {
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to transition work order states.');
    }

    const workOrder = await this.maintenanceRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found.`);
    }

    await this.validateWorkOrderAccess(workOrder, user);

    const oldStatus = workOrder.status;
    const newStatus = dto.status;

    // Transition State Machine Legality check
    const validTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
      [WorkOrderStatus.SUBMITTED]: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.ASSIGNED]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.ON_HOLD, WorkOrderStatus.RESOLVED, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.ON_HOLD]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
      [WorkOrderStatus.RESOLVED]: [], // COMPLETED is terminal
      [WorkOrderStatus.CANCELLED]: [], // CANCELLED is terminal
    };

    if (!validTransitions[oldStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${oldStatus} to ${newStatus}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = { status: newStatus };
      if (newStatus === WorkOrderStatus.RESOLVED) {
        updateData.actualCompletionDate = new Date();
      }

      // Update WorkOrder
      const updated = await tx.workOrder.update({
        where: { id },
        data: updateData,
      });

      // Write status history log
      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: id,
          oldStatus,
          newStatus,
          changedByUserId: user.id,
          reasonDescription: dto.reasonDescription || `Status changed from ${oldStatus} to ${newStatus}`,
        },
      });

      return updated;
    });
  }

  /**
   * Assigns or reassigns a vendor, recording history.
   */
  async assignVendor(
    id: string,
    dto: AssignVendorDto,
    user: { id: string; role: string },
  ): Promise<WorkOrder> {
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to assign vendors.');
    }

    const workOrder = await this.maintenanceRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found.`);
    }

    await this.validateWorkOrderAccess(workOrder, user);

    if (workOrder.status === WorkOrderStatus.RESOLVED || workOrder.status === WorkOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot assign vendors to a closed work order.');
    }

    if (dto.vendorId) {
      // Verify vendor exists
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, deletedAt: null },
      });
      if (!vendor) {
        throw new NotFoundException(`Vendor with ID ${dto.vendorId} not found.`);
      }
    }

    const previousVendorId = workOrder.vendorId;
    const assignedVendorId = dto.vendorId || null;

    return this.prisma.$transaction(async (tx) => {
      // If status is SUBMITTED and we are assigning a vendor, transition status to ASSIGNED
      const oldStatus = workOrder.status;
      let newStatus = oldStatus;
      if (oldStatus === WorkOrderStatus.SUBMITTED && assignedVendorId) {
        newStatus = WorkOrderStatus.ASSIGNED;
      }

      const updated = await tx.workOrder.update({
        where: { id },
        data: {
          vendorId: assignedVendorId,
          status: newStatus,
        },
      });

      // Write vendor assignment audit event using WorkOrderStatusHistory
      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: id,
          oldStatus: oldStatus === newStatus ? null : oldStatus, // Null if only assignment changed without status mutation, else old status
          newStatus,
          changedByUserId: user.id,
          assignedVendorId,
          previousVendorId,
          reasonDescription: dto.reasonDescription || 'Vendor Assignment Update',
        },
      });

      return updated;
    });
  }

  /**
   * Creates an immutable comment linked to a work order.
   */
  async createComment(
    id: string,
    dto: CreateCommentDto,
    user: { id: string; role: string },
  ): Promise<WorkOrderComment> {
    const workOrder = await this.maintenanceRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found.`);
    }

    await this.validateWorkOrderAccess(workOrder, user);

    return this.prisma.$transaction(async (tx) => {
      return tx.workOrderComment.create({
        data: {
          workOrderId: id,
          authorId: user.id,
          body: dto.body,
        },
        include: {
          author: true,
        },
      });
    });
  }

  /**
   * Retrieves status history list.
   */
  async findHistory(id: string, user: { id: string; role: string }): Promise<WorkOrderStatusHistory[]> {
    const workOrder = await this.maintenanceRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found.`);
    }

    await this.validateWorkOrderAccess(workOrder, user);
    return this.maintenanceRepository.findHistoryByWorkOrderId(id);
  }

  /**
   * Deletes a work order (soft-delete).
   */
  async remove(id: string, user: { id: string; role: string }): Promise<WorkOrder> {
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tenants are not authorized to delete work orders.');
    }

    const workOrder = await this.maintenanceRepository.findWorkOrderById(id);
    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${id} not found.`);
    }

    await this.validateWorkOrderAccess(workOrder, user);

    return this.prisma.$transaction(async (tx) => {
      return tx.workOrder.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  // ==========================================
  // HELPER AND SCORING PROCEDURES
  // ==========================================

  private async validateLandlordOwnership(propertyId: string, landlordId: string): Promise<void> {
    const landlordUnitsInProperty = await this.prisma.unit.count({
      where: { propertyId, landlordId, deletedAt: null }
    });
    if (landlordUnitsInProperty === 0) {
      throw new ForbiddenException('You do not have permission to manage resources under this property.');
    }
  }

  private async validateTenantLease(unitId: string, tenantId: string): Promise<void> {
    const activeLease = await this.prisma.lease.findFirst({
      where: {
        unitId,
        status: 'ACTIVE',
        deletedAt: null,
        leaseTenants: {
          some: {
            tenantId,
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!activeLease) {
      throw new ForbiddenException('You can only submit maintenance requests for the unit you currently lease.');
    }
  }

  private async validateWorkOrderAccess(workOrder: WorkOrder, user: { id: string; role: string }): Promise<void> {
    if (user.role === UserRole.LANDLORD) {
      if (workOrder.unitId) {
        const unit = await this.prisma.unit.findUnique({ where: { id: workOrder.unitId } });
        if (unit?.landlordId !== user.id) {
          throw new ForbiddenException('You do not have permission to manage resources under this unit.');
        }
      } else {
        await this.validateLandlordOwnership(workOrder.propertyId, user.id);
      }
    } else if (user.role === UserRole.TENANT) {
      if (!workOrder.unitId) {
        throw new ForbiddenException('You do not have access to property-wide work orders.');
      }
      await this.validateTenantLease(workOrder.unitId, user.id);
    }
  }
}
