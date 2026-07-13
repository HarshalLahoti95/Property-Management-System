import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Lease, RentCharge, Payment, Unit, WorkOrderStatus, WorkOrderPriority } from '@prisma/client';

@Injectable()
export class ReportingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates occupancy metrics.
   */
  async getOccupancyRate(landlordId?: string): Promise<{ occupiedUnits: number; totalUnits: number; occupancyRate: number }> {
    const totalUnits = await this.prisma.unit.count({
      where: {
        deletedAt: null,
        landlordId: landlordId ? landlordId : undefined,
      },
    });

    const occupiedUnits = await this.prisma.lease.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        unit: landlordId ? { landlordId } : undefined,
      },
    });

    return {
      occupiedUnits,
      totalUnits,
      occupancyRate: totalUnits === 0 ? 0 : parseFloat(((occupiedUnits / totalUnits) * 100).toFixed(2)),
    };
  }

  /**
   * Lists leases scheduled to expire within threshold.
   */
  async getLeaseExpirations(landlordId?: string, thresholdDays = 30): Promise<any[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);

    return this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        endDate: {
          gte: new Date(),
          lte: thresholdDate,
        },
        unit: landlordId ? { landlordId } : undefined,
      },
      include: {
        unit: { include: { property: true } },
        leaseTenants: { include: { tenant: true } },
      },
      orderBy: { endDate: 'asc' },
    });
  }

  /**
   * Compiles outstanding balances, rent totals, and payment collection rates.
   */
  async getFinancialMetrics(landlordId?: string): Promise<{
    totalCharged: number;
    totalPaid: number;
    outstanding: number;
    collectionRate: number;
  }> {
    const rentAggregation = await this.prisma.rentCharge.aggregate({
      _sum: {
        amount: true,
        paidAmount: true,
      },
      where: {
        status: { not: 'VOIDED' },
        ledger: {
          lease: {
            status: 'ACTIVE',
            unit: landlordId ? { landlordId } : undefined,
          },
        },
      },
    });

    const totalCharged = rentAggregation._sum.amount?.toNumber() || 0;
    const totalPaid = rentAggregation._sum.paidAmount?.toNumber() || 0;
    const outstanding = totalCharged - totalPaid;
    const collectionRate = totalCharged === 0 ? 0 : parseFloat(((totalPaid / totalCharged) * 100).toFixed(2));

    return {
      totalCharged,
      totalPaid,
      outstanding,
      collectionRate,
    };
  }

  /**
   * Compiles payment receipts aggregated by Year-Month.
   */
  async getPaymentTrends(landlordId?: string): Promise<Array<{ month: string; amount: number }>> {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'CLEARED',
        paymentDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }, // last 6 months
        ledger: landlordId ? { lease: { unit: { landlordId } } } : undefined,
      },
      select: {
        amount: true,
        paymentDate: true,
      },
    });

    const trends: Record<string, number> = {};
    for (const p of payments) {
      const month = p.paymentDate.toISOString().slice(0, 7); // 'YYYY-MM'
      trends[month] = (trends[month] || 0) + p.amount.toNumber();
    }

    return Object.entries(trends)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Compiles raw lease data details for exports.
   */
  async getRawLeasesForExport(landlordId?: string): Promise<any[]> {
    return this.prisma.lease.findMany({
      where: {
        deletedAt: null,
        unit: landlordId ? { landlordId } : undefined,
      },
      include: {
        unit: { include: { property: true } },
        leaseTenants: { include: { tenant: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Compiles raw payment details for exports.
   */
  async getRawFinancialsForExport(landlordId?: string): Promise<any[]> {
    return this.prisma.payment.findMany({
      where: {
        ledger: landlordId ? { lease: { unit: { landlordId } } } : undefined,
      },
      include: {
        tenant: true,
        ledger: { include: { lease: { include: { unit: { include: { property: true } } } } } },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }
}
