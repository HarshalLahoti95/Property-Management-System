import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  Payment,
  PaymentAllocation,
  PaymentStatus,
  UserRole,
  Prisma,
} from '@prisma/client';

@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'payment');
  }

  /**
   * Retrieves a single payment by its UUID, including ledger and tenant relations.
   */
  async findPaymentById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
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
        tenant: true,
      },
    });
  }

  /**
   * Queries list of payments with filtration.
   */
  async findPayments(params: {
    skip: number;
    take: number;
    ledgerId?: string;
    tenantId?: string;
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    landlordId?: string;
  }): Promise<Payment[]> {
    const where = this.buildPaymentWhereClause(params);

    return this.prisma.payment.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { paymentDate: 'desc' },
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
        tenant: true,
      },
    });
  }

  /**
   * Counts payments matching filtration criteria.
   */
  async countPayments(params: {
    ledgerId?: string;
    tenantId?: string;
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    landlordId?: string;
  }): Promise<number> {
    const where = this.buildPaymentWhereClause(params);
    return this.prisma.payment.count({ where });
  }

  /**
   * Retrieves allocation history for a specific payment.
   */
  async findAllocationsByPaymentId(paymentId: string): Promise<PaymentAllocation[]> {
    return this.prisma.paymentAllocation.findMany({
      where: { paymentId },
      include: {
        rentCharge: true,
      },
      orderBy: { allocatedAt: 'asc' },
    });
  }

  /**
   * Enforces role-based permissions on a target FinancialLedger.
   */
  async validateLedgerAccess(
    ledgerId: string,
    user: { id: string; role: string },
  ): Promise<any> {
    const ledger = await this.prisma.financialLedger.findUnique({
      where: { id: ledgerId },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            leaseTenants: true,
          },
        },
      },
    });

    if (!ledger) {
      throw new NotFoundException(`Ledger with ID ${ledgerId} not found.`);
    }

    if (user.role === UserRole.LANDLORD && ledger.lease.unit.landlordId !== user.id) {
      throw new ForbiddenException('You do not have access to payments on this ledger.');
    }

    if (user.role === UserRole.TENANT) {
      const isTenantOnLease = ledger.lease.leaseTenants.some((lt) => lt.tenantId === user.id);
      if (!isTenantOnLease) {
        throw new ForbiddenException('You do not have permission to submit payments for this ledger.');
      }
    }

    return ledger;
  }

  /**
   * Builds the prisma filter structure for payment queries.
   */
  private buildPaymentWhereClause(params: {
    ledgerId?: string;
    tenantId?: string;
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    landlordId?: string;
  }): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {};

    if (params.ledgerId) {
      where.ledgerId = params.ledgerId;
    }

    if (params.tenantId) {
      where.tenantId = params.tenantId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.startDate || params.endDate) {
      where.paymentDate = {};
      if (params.startDate) {
        where.paymentDate.gte = params.startDate;
      }
      if (params.endDate) {
        where.paymentDate.lte = params.endDate;
      }
    }

    if (params.landlordId) {
      where.ledger = {
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
