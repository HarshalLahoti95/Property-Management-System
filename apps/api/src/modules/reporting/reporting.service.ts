import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { ReportingRepository } from './reporting.repository';
import { CacheService } from './services/cache.service';
import { MaintenanceRepository } from '../maintenance/maintenance.repository';
import { NotificationEventBus } from '../notification/notification.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class ReportingService {
  private readonly defaultTtl = 3600; // 1 hour caching

  constructor(
    private readonly reportingRepository: ReportingRepository,
    private readonly cacheService: CacheService,
    private readonly eventBus: NotificationEventBus,
    private readonly maintenanceRepository: MaintenanceRepository,
  ) {
    this.registerEventListeners();
  }

  /**
   * Compiles general overview dashboard stats.
   */
  async getSummary(user: { id: string; role: string }): Promise<any> {
    this.validateAccess(user);
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;
    const cacheKey = landlordId ? `reports:landlord:${landlordId}:summary` : 'reports:admin:summary';

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const [occupancy, financials, openMaintenance, emergencyMaintenance] = await Promise.all([
      this.reportingRepository.getOccupancyRate(landlordId),
      this.reportingRepository.getFinancialMetrics(landlordId),
      this.maintenanceRepository.getOpenWorkOrdersCount(landlordId),
      this.maintenanceRepository.getEmergencyWorkOrdersCount(landlordId),
    ]);

    const result = {
      occupancyRate: occupancy.occupancyRate,
      occupiedUnits: occupancy.occupiedUnits,
      totalUnits: occupancy.totalUnits,
      totalCharged: financials.totalCharged,
      totalPaid: financials.totalPaid,
      outstandingBalance: financials.outstanding,
      collectionRate: financials.collectionRate,
      openWorkOrders: openMaintenance,
      emergencyWorkOrders: emergencyMaintenance,
    };

    await this.cacheService.set(cacheKey, result, this.defaultTtl);
    return result;
  }

  /**
   * Compiles detailed occupancy trends.
   */
  async getOccupancy(user: { id: string; role: string }): Promise<any> {
    this.validateAccess(user);
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;
    const cacheKey = landlordId ? `reports:landlord:${landlordId}:occupancy` : 'reports:admin:occupancy';

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const [occupancy, expirations] = await Promise.all([
      this.reportingRepository.getOccupancyRate(landlordId),
      this.reportingRepository.getLeaseExpirations(landlordId, 30),
    ]);

    const result = {
      ...occupancy,
      expirationsNext30Days: expirations.map((e) => ({
        leaseId: e.id,
        property: e.unit.property.name,
        unit: e.unit.name,
        endDate: e.endDate,
        tenants: e.leaseTenants.map((lt: any) => lt.tenant.fullName),
      })),
    };

    await this.cacheService.set(cacheKey, result, this.defaultTtl);
    return result;
  }

  /**
   * Compiles revenue history trends.
   */
  async getFinancials(user: { id: string; role: string }): Promise<any> {
    this.validateAccess(user);
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;
    const cacheKey = landlordId ? `reports:landlord:${landlordId}:financials` : 'reports:admin:financials';

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const [financials, paymentTrends] = await Promise.all([
      this.reportingRepository.getFinancialMetrics(landlordId),
      this.reportingRepository.getPaymentTrends(landlordId),
    ]);

    const result = {
      ...financials,
      paymentTrends,
    };

    await this.cacheService.set(cacheKey, result, this.defaultTtl);
    return result;
  }

  /**
   * Compiles maintenance statistics using reusable MaintenanceRepository logic.
   */
  async getMaintenance(user: { id: string; role: string }): Promise<any> {
    this.validateAccess(user);
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;
    const cacheKey = landlordId ? `reports:landlord:${landlordId}:maintenance` : 'reports:admin:maintenance';

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const [countByStatus, countByPriority, averageTime, costSummary] = await Promise.all([
      this.maintenanceRepository.getWorkOrdersCountByStatus(landlordId),
      this.maintenanceRepository.getWorkOrdersCountByPriority(landlordId),
      this.maintenanceRepository.getAverageCompletionTime(landlordId),
      this.maintenanceRepository.getCostSummaries(landlordId),
    ]);

    const result = {
      countByStatus,
      countByPriority,
      averageCompletionTimeDays: averageTime,
      totalEstimatedCost: costSummary.totalEstimated,
      totalActualCost: costSummary.totalActual,
    };

    await this.cacheService.set(cacheKey, result, this.defaultTtl);
    return result;
  }

  /**
   * Compiles lease data history in CSV stream syntax.
   */
  async exportLeases(user: { id: string; role: string }): Promise<string> {
    this.validateAccess(user);
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;
    const rawData = await this.reportingRepository.getRawLeasesForExport(landlordId);

    const headers = ['Lease ID', 'Property', 'Unit', 'Start Date', 'End Date', 'Monthly Rent', 'Status', 'Tenants'];
    const rows = rawData.map((l) => {
      const tenantNames = l.leaseTenants.map((lt: any) => lt.tenant.fullName).join('; ');
      return [
        l.id,
        `"${l.unit.property.name.replace(/"/g, '""')}"`,
        `"${l.unit.name.replace(/"/g, '""')}"`,
        l.startDate.toISOString().slice(0, 10),
        l.endDate.toISOString().slice(0, 10),
        l.monthlyRent.toNumber(),
        l.status,
        `"${tenantNames.replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Compiles financial receipts data in CSV stream syntax.
   */
  async exportFinancials(user: { id: string; role: string }): Promise<string> {
    this.validateAccess(user);
    const landlordId = user.role === UserRole.LANDLORD ? user.id : undefined;
    const rawData = await this.reportingRepository.getRawFinancialsForExport(landlordId);

    const headers = ['Payment ID', 'Property', 'Unit', 'Tenant', 'Amount', 'Payment Method', 'Date', 'Transaction Ref', 'Status'];
    const rows = rawData.map((p) => {
      return [
        p.id,
        `"${p.ledger.lease.unit.property.name.replace(/"/g, '""')}"`,
        `"${p.ledger.lease.unit.name.replace(/"/g, '""')}"`,
        `"${p.tenant.fullName.replace(/"/g, '""')}"`,
        p.amount.toNumber(),
        p.paymentMethod,
        p.paymentDate.toISOString().slice(0, 10),
        p.transactionReference,
        p.status,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // ==========================================
  // HELPER AND SCORING PROCEDURES
  // ==========================================

  private validateAccess(user: { role: string }): void {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.LANDLORD) {
      throw new ForbiddenException('Tenants are not authorized to view reports or dashboards.');
    }
  }

  /**
   * Sets post-commit observers to clear caches dynamically.
   */
  private registerEventListeners(): void {
    // Occupancy invalidations on lease updates
    this.eventBus.on('lease.activated', async () => this.invalidateOccupancy());
    this.eventBus.on('lease.terminated', async () => this.invalidateOccupancy());

    // Financial invalidations on payments
    this.eventBus.on('payment.received', async () => this.invalidateFinancials());
    this.eventBus.on('payment.refunded', async () => this.invalidateFinancials());

    // Maintenance invalidations on work orders
    this.eventBus.on('maintenance.created', async () => this.invalidateMaintenance());
    this.eventBus.on('maintenance.completed', async () => this.invalidateMaintenance());
  }

  private async invalidateOccupancy(): Promise<void> {
    await this.cacheService.delPattern('reports:*:occupancy');
    await this.cacheService.delPattern('reports:*:summary');
  }

  private async invalidateFinancials(): Promise<void> {
    await this.cacheService.delPattern('reports:*:financials');
    await this.cacheService.delPattern('reports:*:summary');
  }

  private async invalidateMaintenance(): Promise<void> {
    await this.cacheService.delPattern('reports:*:maintenance');
    await this.cacheService.delPattern('reports:*:summary');
  }
}
