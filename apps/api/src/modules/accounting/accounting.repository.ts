import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  FinancialLedger,
  RentCharge,
  LedgerBalanceHistory,
  LedgerType,
  ChargeStatus,
  ChargeType,
  UserRole,
  Prisma,
} from '@prisma/client';

@Injectable()
export class AccountingRepository extends BaseRepository<FinancialLedger> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'financialLedger');
  }

  /**
   * Retrieves both ledgers (Operating and Trust) for a specific Lease.
   */
  async findLedgersByLeaseId(leaseId: string): Promise<FinancialLedger[]> {
    return this.prisma.financialLedger.findMany({
      where: { leaseId },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieves a single ledger by its ID.
   */
  async findLedgerById(id: string): Promise<FinancialLedger | null> {
    return this.prisma.financialLedger.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieves a single charge by ID.
   */
  async findChargeById(id: string): Promise<any> {
    return this.prisma.rentCharge.findUnique({
      where: { id },
      include: {
        ledger: {
          include: {
            lease: {
              include: {
                unit: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Queries charges with filtration and pagination, scoped to landlord if required.
   */
  async findCharges(params: {
    skip: number;
    take: number;
    leaseId?: string;
    ledgerId?: string;
    status?: ChargeStatus;
    type?: ChargeType;
    startDate?: Date;
    endDate?: Date;
    landlordId?: string;
  }): Promise<RentCharge[]> {
    const where = this.buildChargeWhereClause(params);

    return this.prisma.rentCharge.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { dueDate: 'asc' },
      include: {
        ledger: {
          include: {
            lease: {
              include: {
                unit: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Counts charges matching filtration criteria.
   */
  async countCharges(params: {
    leaseId?: string;
    ledgerId?: string;
    status?: ChargeStatus;
    type?: ChargeType;
    startDate?: Date;
    endDate?: Date;
    landlordId?: string;
  }): Promise<number> {
    const where = this.buildChargeWhereClause(params);
    return this.prisma.rentCharge.count({ where });
  }

  /**
   * Retrieves balance history for a ledger.
   */
  async findHistory(
    ledgerId: string,
    skip: number,
    take: number,
  ): Promise<LedgerBalanceHistory[]> {
    return this.prisma.ledgerBalanceHistory.findMany({
      where: { ledgerId },
      skip,
      take,
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Counts balance history records for a ledger.
   */
  async countHistory(ledgerId: string): Promise<number> {
    return this.prisma.ledgerBalanceHistory.count({
      where: { ledgerId },
    });
  }

  /**
   * Ownership verification checker.
   */
  async validateLeaseAccess(
    leaseId: string,
    user: { id: string; role: string },
  ): Promise<void> {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, deletedAt: null },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
        leaseTenants: true,
      },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${leaseId} not found.`);
    }

    if (user.role === UserRole.LANDLORD && lease.unit.landlordId !== user.id) {
      throw new ForbiddenException('You do not have permission to access accounting records for this lease.');
    }

    if (user.role === UserRole.TENANT) {
      const isTenantOnLease = lease.leaseTenants.some((lt) => lt.tenantId === user.id);
      if (!isTenantOnLease) {
        throw new ForbiddenException('You do not have permission to access this lease ledger.');
      }
    }
  }

  /**
   * Builds the prisma filter structure for charge queries.
   */
  private buildChargeWhereClause(params: {
    leaseId?: string;
    ledgerId?: string;
    status?: ChargeStatus;
    type?: ChargeType;
    startDate?: Date;
    endDate?: Date;
    landlordId?: string;
  }): Prisma.RentChargeWhereInput {
    const where: Prisma.RentChargeWhereInput = {};

    if (params.ledgerId) {
      where.ledgerId = params.ledgerId;
    }

    if (params.leaseId) {
      where.ledger = { leaseId: params.leaseId };
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.startDate || params.endDate) {
      where.dueDate = {};
      if (params.startDate) {
        where.dueDate.gte = params.startDate;
      }
      if (params.endDate) {
        where.dueDate.lte = params.endDate;
      }
    }

    if (params.landlordId) {
      // Scope to properties owned by this landlord
      where.ledger = {
        ...(where.ledger as Prisma.FinancialLedgerWhereInput),
        lease: {
          unit: {
            landlordId: params.landlordId,
            deletedAt: null,
          },
        },
      };
    }

    return where;
  }
}
