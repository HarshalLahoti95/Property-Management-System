import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompanyMaintenanceDeduction, LeaseStatus, Prisma } from '@prisma/client';

@Injectable()
export class MaintenanceDeductionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a standalone deduction against a lease's collected rent for a work order.
   * This is purely a bookkeeping entry that mathematically reduces the landlord's 
   * derived balance prior to disbursement; it does not move cash in the ledger.
   * 
   * @param workOrderId The UUID of the work order to deduct for.
   * @param recordedByUserId The UUID of the admin/PMC recording the deduction.
   * @param tx Optional Prisma transaction client to execute within an existing transaction.
   * @returns The newly created CompanyMaintenanceDeduction record.
   * 
   * @throws {NotFoundException} If the work order does not exist.
   * @throws {BadRequestException} If the work order lacks an actualCost.
   * @throws {BadRequestException} If the work order has a null unitId (property-wide issue).
   * @throws {BadRequestException} If there is no active lease for the unit.
   * @throws {BadRequestException} If a deduction already exists for this work order (unique constraint).
   */
  async createDeduction(
    workOrderId: string,
    recordedByUserId: string,
    tx?: Prisma.TransactionClient
  ): Promise<CompanyMaintenanceDeduction> {
    const prismaClient = tx ?? this.prisma;
    
    // 1. Fetch work order
    const workOrder = await prismaClient.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order with ID ${workOrderId} not found.`);
    }

    // 2. Validate workOrder.actualCost != null
    if (workOrder.actualCost === null) {
      throw new BadRequestException('Cannot create a deduction for a work order without an actualCost.');
    }

    // 3. Validate workOrder.unitId != null
    if (!workOrder.unitId) {
      throw new BadRequestException('Cannot create a tenant deduction for a property-wide work order (missing unitId).');
    }

    // 4. Resolve the active lease
    const activeLease = await prismaClient.lease.findFirst({
      where: {
        unitId: workOrder.unitId,
        status: LeaseStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!activeLease) {
      throw new BadRequestException('No active lease found for this unit. Cannot create a deduction.');
    }

    // 5. Create the CompanyMaintenanceDeduction
    try {
      const deduction = await prismaClient.companyMaintenanceDeduction.create({
        data: {
          leaseId: activeLease.id,
          workOrderId: workOrder.id,
          amount: workOrder.actualCost,
          deductionMonth: new Date(),
          recordedByUserId,
        },
      });

      return deduction;
    } catch (error: any) {
      // Handle Prisma unique constraint violation code P2002
      if (error.code === 'P2002' && error.meta?.target?.includes('workOrderId')) {
        throw new BadRequestException('A deduction already exists for this work order.');
      }
      throw error;
    }
  }
}
