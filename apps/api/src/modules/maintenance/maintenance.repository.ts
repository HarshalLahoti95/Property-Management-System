import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  WorkOrder,
  WorkOrderStatusHistory,
  WorkOrderComment,
  WorkOrderStatus,
  WorkOrderPriority,
  UserRole,
  Prisma,
} from '@prisma/client';

@Injectable()
export class MaintenanceRepository extends BaseRepository<WorkOrder> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'workOrder');
  }

  /**
   * Retrieves a single work order by ID with all relations.
   */
  async findWorkOrderById(id: string): Promise<WorkOrder | null> {
    return this.prisma.workOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        property: true,
        unit: true,
        vendor: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: {
            changedByUser: true,
            assignedVendor: true,
            previousVendor: true,
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Queries work orders with filters and pagination.
   */
  async findWorkOrders(params: {
    skip: number;
    take: number;
    propertyId?: string;
    unitId?: string;
    priority?: WorkOrderPriority;
    status?: WorkOrderStatus;
    vendorId?: string;
    landlordId?: string;
    tenantUnitId?: string;
  }): Promise<WorkOrder[]> {
    const where = this.buildWorkOrderWhereClause(params);

    return this.prisma.workOrder.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: {
        property: true,
        unit: true,
        vendor: true,
      },
    });
  }

  /**
   * Counts work orders matching filters.
   */
  async countWorkOrders(params: {
    propertyId?: string;
    unitId?: string;
    priority?: WorkOrderPriority;
    status?: WorkOrderStatus;
    vendorId?: string;
    landlordId?: string;
    tenantUnitId?: string;
  }): Promise<number> {
    const where = this.buildWorkOrderWhereClause(params);
    return this.prisma.workOrder.count({ where });
  }

  /**
   * Retrieves status history list for a work order.
   */
  async findHistoryByWorkOrderId(workOrderId: string): Promise<WorkOrderStatusHistory[]> {
    return this.prisma.workOrderStatusHistory.findMany({
      where: { workOrderId },
      include: {
        changedByUser: true,
        assignedVendor: true,
        previousVendor: true,
      },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Retrieves comment list for a work order.
   */
  async findCommentsByWorkOrderId(workOrderId: string): Promise<WorkOrderComment[]> {
    return this.prisma.workOrderComment.findMany({
      where: { workOrderId },
      include: {
        author: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==========================================
  // DASHBOARD METRIC QUERIES
  // ==========================================

  /**
   * Counts currently open work orders (not completed or cancelled).
   */
  async getOpenWorkOrdersCount(landlordId?: string): Promise<number> {
    return this.prisma.workOrder.count({
      where: {
        deletedAt: null,
        status: {
          notIn: [WorkOrderStatus.RESOLVED, WorkOrderStatus.CANCELLED],
        },
        ...(landlordId ? {
          OR: [
            { unit: { landlordId, deletedAt: null } },
            { unitId: null, property: { units: { some: { landlordId, deletedAt: null } } } }
          ]
        } : {})
      },
    });
  }

  /**
   * Counts active emergency priority work orders.
   */
  async getEmergencyWorkOrdersCount(landlordId?: string): Promise<number> {
    return this.prisma.workOrder.count({
      where: {
        deletedAt: null,
        priority: WorkOrderPriority.EMERGENCY,
        status: {
          notIn: [WorkOrderStatus.RESOLVED, WorkOrderStatus.CANCELLED],
        },
        ...(landlordId ? {
          OR: [
            { unit: { landlordId, deletedAt: null } },
            { unitId: null, property: { units: { some: { landlordId, deletedAt: null } } } }
          ]
        } : {})
      },
    });
  }

  /**
   * Groups work order counts by priority levels.
   */
  async getWorkOrdersCountByPriority(landlordId?: string): Promise<Record<WorkOrderPriority, number>> {
    const counts = await this.prisma.workOrder.groupBy({
      by: ['priority'],
      _count: {
        id: true,
      },
      where: {
        deletedAt: null,
        ...(landlordId ? {
          OR: [
            { unit: { landlordId, deletedAt: null } },
            { unitId: null, property: { units: { some: { landlordId, deletedAt: null } } } }
          ]
        } : {})
      },
    });

    const result: Record<WorkOrderPriority, number> = {
      [WorkOrderPriority.LOW]: 0,
      [WorkOrderPriority.MEDIUM]: 0,
      [WorkOrderPriority.HIGH]: 0,
      [WorkOrderPriority.EMERGENCY]: 0,
    };

    for (const group of counts) {
      result[group.priority] = group._count.id;
    }

    return result;
  }

  /**
   * Groups work order counts by status levels.
   */
  async getWorkOrdersCountByStatus(landlordId?: string): Promise<Record<WorkOrderStatus, number>> {
    const counts = await this.prisma.workOrder.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where: {
        deletedAt: null,
        ...(landlordId ? {
          OR: [
            { unit: { landlordId, deletedAt: null } },
            { unitId: null, property: { units: { some: { landlordId, deletedAt: null } } } }
          ]
        } : {})
      },
    });

    const result: Record<WorkOrderStatus, number> = {
      [WorkOrderStatus.SUBMITTED]: 0,
      [WorkOrderStatus.ASSIGNED]: 0,
      [WorkOrderStatus.IN_PROGRESS]: 0,
      [WorkOrderStatus.ON_HOLD]: 0,
      [WorkOrderStatus.RESOLVED]: 0,
      [WorkOrderStatus.CANCELLED]: 0,
    };

    for (const group of counts) {
      result[group.status] = group._count.id;
    }

    return result;
  }

  /**
   * Calculates average duration (in days) between creation date and resolution date.
   */
  async getAverageCompletionTime(landlordId?: string): Promise<number> {
    const completedWorkOrders = await this.prisma.workOrder.findMany({
      where: {
        deletedAt: null,
        status: WorkOrderStatus.RESOLVED,
        actualCompletionDate: { not: null },
        ...(landlordId ? {
          OR: [
            { unit: { landlordId, deletedAt: null } },
            { unitId: null, property: { units: { some: { landlordId, deletedAt: null } } } }
          ]
        } : {})
      },
      select: {
        createdAt: true,
        actualCompletionDate: true,
      },
    });

    if (completedWorkOrders.length === 0) return 0;

    const totalMs = completedWorkOrders.reduce((sum, wo) => {
      const duration = wo.actualCompletionDate!.getTime() - wo.createdAt.getTime();
      return sum + duration;
    }, 0);

    const averageMs = totalMs / completedWorkOrders.length;
    return parseFloat((averageMs / (1000 * 60 * 60 * 24)).toFixed(2)); // return in days
  }

  /**
   * Aggregates total estimated and actual costs.
   */
  async getCostSummaries(landlordId?: string): Promise<{ totalEstimated: number; totalActual: number }> {
    const aggregation = await this.prisma.workOrder.aggregate({
      _sum: {
        estimatedCost: true,
        actualCost: true,
      },
      where: {
        deletedAt: null,
        ...(landlordId ? {
          OR: [
            { unit: { landlordId, deletedAt: null } },
            { unitId: null, property: { units: { some: { landlordId, deletedAt: null } } } }
          ]
        } : {})
      },
    });

    return {
      totalEstimated: aggregation._sum.estimatedCost?.toNumber() || 0,
      totalActual: aggregation._sum.actualCost?.toNumber() || 0,
    };
  }

  // ==========================================
  // HELPER AND SCORING PROCEDURES
  // ==========================================

  /**
   * Formulates filters for fetching list records.
   */
  private buildWorkOrderWhereClause(params: {
    propertyId?: string;
    unitId?: string;
    priority?: WorkOrderPriority;
    status?: WorkOrderStatus;
    vendorId?: string;
    landlordId?: string;
    tenantUnitId?: string;
  }): Prisma.WorkOrderWhereInput {
    const where: Prisma.WorkOrderWhereInput = { deletedAt: null };

    if (params.propertyId) {
      where.propertyId = params.propertyId;
    }

    if (params.unitId) {
      where.unitId = params.unitId;
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.vendorId) {
      where.vendorId = params.vendorId;
    }

    if (params.landlordId) {
      where.OR = [
        { unit: { landlordId: params.landlordId, deletedAt: null } },
        { unitId: null, property: { units: { some: { landlordId: params.landlordId, deletedAt: null } } } }
      ];
    }

    if (params.tenantUnitId) {
      where.unitId = params.tenantUnitId;
    }

    return where;
  }
}
