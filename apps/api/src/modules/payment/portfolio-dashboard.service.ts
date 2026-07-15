import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DisbursementService } from './disbursement.service';
import { ReportingRepository } from '../reporting/reporting.repository';
import { PortfolioDashboardResponseDto, PendingDisbursementDto } from './dto/portfolio-dashboard.dto';

@Injectable()
export class PortfolioDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disbursementService: DisbursementService,
    private readonly reportingRepository: ReportingRepository,
  ) {}

  async getPortfolioDashboard(params: {
    startDate?: string;
    endDate?: string;
    landlordId?: string;
    isLandlord: boolean;
  }): Promise<PortfolioDashboardResponseDto> {
    const { startDate, endDate, landlordId, isLandlord } = params;

    // 1. Fetch matching leases (ACTIVE or EXPIRED typically, but we should fetch anything with a ledger to be safe)
    // Actually, getting all leases for the landlord that aren't deleted.
    const leases = await this.prisma.lease.findMany({
      where: {
        deletedAt: null,
        unit: landlordId ? { landlordId } : undefined,
      },
      include: {
        unit: { include: { property: true } },
      }
    });

    let totalOwedToLandlords = 0;
    let totalCompanyRetained = 0;
    const pendingDisbursements: PendingDisbursementDto[] = [];

    // N+1 loop for the splits (Safe at this scale, guarantees logic cohesion)
    await Promise.all(
      leases.map(async (lease) => {
        const owedToLandlord = await this.disbursementService.computeLandlordAmountOwed(lease.id);
        const owedNum = owedToLandlord.toNumber();
        
        totalOwedToLandlords += owedNum;

        if (owedNum > 0) {
          pendingDisbursements.push({
            leaseId: lease.id,
            propertyName: lease.unit.property.name,
            unitName: lease.unit.unitNumber,
            amountOwed: owedNum,
          });
        }

        if (!isLandlord) {
          const companyRetained = await this.disbursementService.computeCompanyRetainedBalance(lease.id);
          totalCompanyRetained += companyRetained.toNumber();
        }
      })
    );

    // 4. Total Collected via ReportingRepository
    const totalCollected = await this.reportingRepository.getTotalCollected(landlordId, startDate, endDate);

    // 5. Total Maintenance Deductions (for date range)
    let start: Date | undefined;
    let end: Date | undefined;
    if (startDate) start = new Date(startDate);
    if (endDate) end = new Date(endDate);

    const deductionsAgg = await this.prisma.companyMaintenanceDeduction.aggregate({
      _sum: { amount: true },
      where: {
        ...(start || end ? { createdAt: { gte: start, lte: end } } : {}),
        lease: landlordId ? { unit: { landlordId } } : undefined,
      }
    });
    const totalMaintenanceDeductions = deductionsAgg._sum.amount?.toNumber() || 0;

    return {
      totalCollected,
      totalOwedToLandlords,
      ...(isLandlord ? {} : { companyRetainedBalance: totalCompanyRetained }),
      totalMaintenanceDeductions,
      pendingDisbursements,
    };
  }
}
