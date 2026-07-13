import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from '../reporting.service';
import { ReportingRepository } from '../reporting.repository';
import { CacheService } from '../services/cache.service';
import { MaintenanceRepository } from '../../maintenance/maintenance.repository';
import { NotificationEventBus } from '../../notification/notification.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ReportingService', () => {
  let service: ReportingService;
  let repository: ReportingRepository;
  let cacheService: CacheService;
  let eventBus: NotificationEventBus;
  let maintenanceRepository: MaintenanceRepository;

  const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const tenantUser = { id: 'tenant-1', role: UserRole.TENANT };

  const mockOccupancy = { occupiedUnits: 8, totalUnits: 10, occupancyRate: 80.00 };
  const mockFinancials = { totalCharged: 12000.00, totalPaid: 10000.00, outstanding: 2000.00, collectionRate: 83.33 };
  const mockSummary = {
    occupancyRate: 80.00,
    occupiedUnits: 8,
    totalUnits: 10,
    totalCharged: 12000.00,
    totalPaid: 10000.00,
    outstandingBalance: 2000.00,
    collectionRate: 83.33,
    openWorkOrders: 2,
    emergencyWorkOrders: 0,
  };

  const mockRawLease = {
    id: 'lease-1',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-30'),
    monthlyRent: new Prisma.Decimal(1200),
    status: 'ACTIVE',
    unit: {
      name: '101',
      property: { name: 'Main St St' },
    },
    leaseTenants: [{ tenant: { fullName: 'John Doe' } }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        NotificationEventBus,
        CacheService,
        {
          provide: ReportingRepository,
          useValue: {
            getOccupancyRate: jest.fn().mockResolvedValue(mockOccupancy),
            getLeaseExpirations: jest.fn().mockResolvedValue([]),
            getFinancialMetrics: jest.fn().mockResolvedValue(mockFinancials),
            getPaymentTrends: jest.fn().mockResolvedValue([]),
            getRawLeasesForExport: jest.fn().mockResolvedValue([mockRawLease]),
            getRawFinancialsForExport: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: MaintenanceRepository,
          useValue: {
            getOpenWorkOrdersCount: jest.fn().mockResolvedValue(2),
            getEmergencyWorkOrdersCount: jest.fn().mockResolvedValue(0),
            getWorkOrdersCountByStatus: jest.fn().mockResolvedValue({}),
            getWorkOrdersCountByPriority: jest.fn().mockResolvedValue({}),
            getAverageCompletionTime: jest.fn().mockResolvedValue(1.5),
            getCostSummaries: jest.fn().mockResolvedValue({ totalEstimated: 200, totalActual: 150 }),
          },
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    repository = module.get<ReportingRepository>(ReportingRepository);
    cacheService = module.get<CacheService>(CacheService);
    eventBus = module.get<NotificationEventBus>(NotificationEventBus);
    maintenanceRepository = module.get<MaintenanceRepository>(MaintenanceRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Authorization', () => {
    it('should reject reports query by tenants', async () => {
      await expect(service.getSummary(tenantUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSummary', () => {
    it('should fetch aggregates and save to cache on empty lookup', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValueOnce(null);
      jest.spyOn(cacheService, 'set');

      const result = await service.getSummary(landlordUser);

      expect(cacheService.get).toHaveBeenCalledWith('reports:landlord:landlord-1:summary');
      expect(repository.getOccupancyRate).toHaveBeenCalledWith('landlord-1');
      expect(cacheService.set).toHaveBeenCalled();
      expect(result.occupancyRate).toBe(80.00);
      expect(result.openWorkOrders).toBe(2);
    });

    it('should directly return cached value if present in cache', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValueOnce(mockSummary);
      jest.spyOn(repository, 'getOccupancyRate');

      const result = await service.getSummary(landlordUser);

      expect(repository.getOccupancyRate).not.toHaveBeenCalled();
      expect(result).toEqual(mockSummary);
    });
  });

  describe('exportLeases', () => {
    it('should generate valid comma-separated layout rows', async () => {
      const result = await service.exportLeases(landlordUser);
      expect(result).toContain('Lease ID,Property,Unit,Start Date,End Date,Monthly Rent,Status,Tenants');
      expect(result).toContain('Main St St');
      expect(result).toContain('John Doe');
    });
  });

  describe('Cache Invalidation observers', () => {
    it('should evict cached summaries when lease.activated event fires', async () => {
      jest.spyOn(cacheService, 'delPattern');
      eventBus.emit('lease.activated');

      // Async queue backoff resolver wait
      await new Promise((resolve) => setImmediate(resolve));

      expect(cacheService.delPattern).toHaveBeenCalledWith('reports:*:occupancy');
      expect(cacheService.delPattern).toHaveBeenCalledWith('reports:*:summary');
    });
  });
});
