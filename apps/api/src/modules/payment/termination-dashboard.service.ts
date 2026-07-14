import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DisbursementService } from './disbursement.service';
import { GetTerminationDashboardQueryDto } from './dto/get-termination-dashboard-query.dto';
import { LeaseStatus, LedgerType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TerminationDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disbursementService: DisbursementService,
  ) {}

  async getTerminationDashboard(query: GetTerminationDashboardQueryDto) {
    const { propertyId, status, daysUntilDeadline } = query;

    const statusFilter = status 
      ? [status as unknown as LeaseStatus] 
      : [LeaseStatus.EXPIRED, LeaseStatus.TERMINATED];

    // Fetch leases via direct Prisma access
    const leases = await this.prisma.lease.findMany({
      where: {
        status: { in: statusFilter },
        ...(propertyId && { unit: { propertyId } })
      },
      include: {
        accountingConfig: true,
        financialLedgers: true,
        unit: {
          include: { property: true }
        },
        leaseTenants: {
          include: { tenant: true }
        },
        rentCharges: {
          where: { status: { not: 'PAID' } }
        }
      }
    });

    const results = await Promise.all(leases.map(async (lease) => {
      // Handle missing actualEndDate with explicit tracking flag
      let actualEndDate = lease.actualEndDate;
      let actualEndDateIsEstimated = false;
      
      if (!actualEndDate) {
        actualEndDate = lease.endDate;
        actualEndDateIsEstimated = true;
      }

      // Lazy config defaults (no DB write)
      const tenantGracePeriodDays = lease.accountingConfig?.tenantGracePeriodDays ?? 0;

      // Compute gracePeriodDeadline (Native Date math)
      const gracePeriodDeadline = new Date(actualEndDate.getTime());
      gracePeriodDeadline.setDate(gracePeriodDeadline.getDate() + tenantGracePeriodDays);

      const isDeadlinePassed = gracePeriodDeadline < new Date();

      // Trust balance
      const trustLedger = lease.financialLedgers.find(l => l.ledgerType === LedgerType.TRUST);
      const trustBalance = trustLedger?.runningBalance || new Decimal(0);

      // Outstanding tenant debt (sum of unpaid RentCharges)
      const outstandingTenantDebt = lease.rentCharges.reduce(
        (sum, charge) => sum.add(charge.amount.sub(charge.paidAmount)),
        new Decimal(0)
      );

      // Amount owed to landlord
      const amountOwedToLandlord = await this.disbursementService.computeLandlordAmountOwed(lease.id);

      return {
        leaseId: lease.id,
        unitName: lease.unit.unitNumber,
        propertyName: lease.unit.property.name,
        actualEndDate,
        actualEndDateIsEstimated, // Explicit visibility!
        tenantGracePeriodDays,
        gracePeriodDeadline,
        isDeadlinePassed,
        trustBalance,
        outstandingTenantDebt,
        amountOwedToLandlord,
        tenants: lease.leaseTenants.map(lt => ({
          name: lt.tenant.fullName,
          email: lt.tenant.email
        }))
      };
    }));

    // Filter by daysUntilDeadline if provided
    let filteredResults = results;
    if (daysUntilDeadline !== undefined) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysUntilDeadline);
      filteredResults = results.filter(r => r.gracePeriodDeadline <= targetDate);
    }

    // Sort ascending by gracePeriodDeadline
    return filteredResults.sort((a, b) => a.gracePeriodDeadline.getTime() - b.gracePeriodDeadline.getTime());
  }
}
