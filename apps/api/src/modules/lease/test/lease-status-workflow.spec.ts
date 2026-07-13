import { Test, TestingModule } from '@nestjs/testing';
import { LeaseStatusService } from '../lease-status.service';
import { LeaseRepository } from '../lease.repository';
import { PrismaService } from '../../../database/prisma.service';
import { LeaseStatus, UserRole, UnitOccupancyStatus, LeaseTenantStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NotificationEventBus } from '../../notification/notification.service';
import { LeaseDocumentGeneratorService } from '../services/lease-document-generator.service';

describe('LeaseStatus Workflow Acceptance Tests', () => {
  let service: LeaseStatusService;
  let prisma: PrismaService;
  let repository: LeaseRepository;

  const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const tenant1 = { id: 'tenant-1', role: UserRole.TENANT };
  const tenant2 = { id: 'tenant-2', role: UserRole.TENANT };

  const unitId = 'unit-1';
  const leaseId = 'lease-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaseStatusService,
        {
          provide: LeaseRepository,
          useValue: {
            findActiveById: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            unit: { updateMany: jest.fn(), update: jest.fn() },
            lease: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
            leaseTenant: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
            leaseStatusHistory: { create: jest.fn() },
          },
        },
        {
          provide: NotificationEventBus,
          useValue: { emit: jest.fn(), on: jest.fn() },
        },
        {
          provide: LeaseDocumentGeneratorService,
          useValue: { generateDocument: jest.fn().mockResolvedValue(undefined) },
        }
      ],
    }).compile();

    service = module.get<LeaseStatusService>(LeaseStatusService);
    prisma = module.get<PrismaService>(PrismaService);
    repository = module.get<LeaseRepository>(LeaseRepository);
  });

  const getMockLease = (status: LeaseStatus, overrides: any = {}) => ({
    id: leaseId,
    unitId,
    status,
    createdByUserId: landlordUser.id,
    unit: { landlordId: landlordUser.id },
    leaseTenants: [
      { id: 'lt-1', tenantId: tenant1.id, status: LeaseTenantStatus.PENDING, ...overrides.lt1 },
      { id: 'lt-2', tenantId: tenant2.id, status: LeaseTenantStatus.PENDING, ...overrides.lt2 },
    ],
  });

  describe('1. createDraft: Occupancy Guard', () => {
    it('throws BadRequestException if unit.occupancyStatus is not VACANT', async () => {
      jest.spyOn(prisma.unit, 'updateMany').mockResolvedValue({ count: 0 } as any);
      
      await expect(service.createDraft({
        unitId, startDate: new Date(), endDate: new Date(),
        monthlyRent: 1000, securityDeposit: 1000, rentDueDay: 1,
        gracePeriodDays: 5, tenantIds: [tenant1.id]
      }, landlordUser)).rejects.toThrow(BadRequestException);

      expect(prisma.lease.create).not.toHaveBeenCalled();
    });
  });

  describe('2. createDraft: Concurrent Calls', () => {
    it('handles concurrent calls correctly', async () => {
      const data = {
        unitId, startDate: new Date(), endDate: new Date(),
        monthlyRent: 1000, securityDeposit: 1000, rentDueDay: 1,
        gracePeriodDays: 5, tenantIds: [tenant1.id]
      };

      jest.spyOn(prisma.unit, 'updateMany')
        .mockResolvedValueOnce({ count: 1 } as any) // 1st wins
        .mockResolvedValueOnce({ count: 0 } as any); // 2nd loses

      jest.spyOn(prisma.lease, 'create').mockResolvedValue({ id: 'new-lease' } as any);

      // First call succeeds
      const result = await service.createDraft(data, landlordUser);
      expect(result.id).toBe('new-lease');
      expect(prisma.lease.create).toHaveBeenCalledTimes(1);

      // Second call fails
      await expect(service.createDraft(data, landlordUser)).rejects.toThrow(BadRequestException);
      expect(prisma.lease.create).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('3. Terminal Statuses: unit becomes VACANT and dead-end', () => {
    const terminals = [LeaseStatus.CANCELLED, LeaseStatus.REJECTED, LeaseStatus.DECLINED, LeaseStatus.EXPIRED, LeaseStatus.TERMINATED];

    for (const termStatus of terminals) {
      it(`enforces dead-end for ${termStatus}`, async () => {
        const terminalLease = getMockLease(termStatus);
        jest.spyOn(repository, 'findActiveById').mockResolvedValue(terminalLease as any);
        jest.clearAllMocks();

        await expect(service.expireLease(leaseId)).rejects.toThrow();
        await expect(service.submitForLandlordApproval(leaseId, adminUser)).rejects.toThrow();

        expect(prisma.lease.update).not.toHaveBeenCalled();
        expect(prisma.unit.update).not.toHaveBeenCalled();
      });
    }

    it('sets occupancyStatus to VACANT when transitioning to a terminal status (e.g. TERMINATED)', async () => {
      const activeLease = getMockLease(LeaseStatus.ACTIVE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(activeLease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({ status: LeaseStatus.TERMINATED } as any);

      await service.terminateDirectly(leaseId, landlordUser);

      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: unitId },
        data: { occupancyStatus: UnitOccupancyStatus.VACANT },
      });
    });
  });

  describe('4. Permission Matrix', () => {
    it('ADMIN cannot call approveLease()', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(getMockLease(LeaseStatus.PENDING_LANDLORD_APPROVAL) as any);
      await expect(service.approveLease(leaseId, adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN cannot call cancelLease() at any stage', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(getMockLease(LeaseStatus.DRAFT) as any);
      await expect(service.cancelLease(leaseId, adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('LANDLORD cannot call requestTermination()', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(getMockLease(LeaseStatus.ACTIVE) as any);
      await expect(service.requestTermination(leaseId, landlordUser)).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN cannot call terminateDirectly()', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(getMockLease(LeaseStatus.ACTIVE) as any);
      await expect(service.terminateDirectly(leaseId, adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN cannot call approveTermination() or rejectTermination()', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(getMockLease(LeaseStatus.PENDING_TERMINATION_APPROVAL) as any);
      await expect(service.approveTermination(leaseId, adminUser)).rejects.toThrow(ForbiddenException);
      await expect(service.rejectTermination(leaseId, adminUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('5. Multi-tenant signing', () => {
    it('requires all tenants to sign before becoming ACTIVE', async () => {
      const lease = getMockLease(LeaseStatus.PENDING_TENANT_SIGNATURE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({} as any);
      
      // Simulate first tenant signing: Not all signed
      jest.spyOn(prisma.leaseTenant, 'findMany').mockResolvedValue([
        { tenantId: tenant1.id, signedAt: new Date() },
        { tenantId: tenant2.id, signedAt: null },
      ] as any);
      jest.spyOn(prisma.lease, 'findFirst').mockResolvedValue(lease as any); // Returns the unchanged lease because it doesn't transition

      const result1 = await service.signLease(leaseId, tenant1);
      expect(result1.status).toBe(LeaseStatus.PENDING_TENANT_SIGNATURE);
      expect(prisma.lease.update).not.toHaveBeenCalled();

      // Simulate second tenant signing: All signed
      jest.spyOn(prisma.leaseTenant, 'findMany').mockResolvedValue([
        { tenantId: tenant1.id, signedAt: new Date() },
        { tenantId: tenant2.id, signedAt: new Date() },
      ] as any);
      
      // Concurrency guard mock setup (returns original lease for current, null for overlap)
      jest.spyOn(prisma.lease, 'findFirst')
        .mockResolvedValueOnce(lease as any) // current
        .mockResolvedValueOnce(null as any); // overlap

      jest.spyOn(prisma.lease, 'update').mockResolvedValue({ ...lease, status: LeaseStatus.ACTIVE } as any);

      const result2 = await service.signLease(leaseId, tenant2);
      expect(result2.status).toBe(LeaseStatus.ACTIVE);
      
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: unitId },
        data: { occupancyStatus: UnitOccupancyStatus.OCCUPIED },
      });
    });
  });

  describe('6. declineLease cascade', () => {
    it('declining by one tenant immediately cascades lease to DECLINED', async () => {
      const lease = getMockLease(LeaseStatus.PENDING_TENANT_SIGNATURE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({ status: LeaseStatus.DECLINED } as any);

      const result = await service.declineLease(leaseId, tenant1);
      expect(result.status).toBe(LeaseStatus.DECLINED);
      
      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: unitId },
        data: { occupancyStatus: UnitOccupancyStatus.VACANT },
      });
    });
  });

  describe('7. expireLease handling', () => {
    it('succeeds from ACTIVE with standard reason', async () => {
      const lease = getMockLease(LeaseStatus.ACTIVE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({ status: LeaseStatus.EXPIRED } as any);

      await service.expireLease(leaseId);
      
      expect(prisma.leaseStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newStatus: LeaseStatus.EXPIRED,
          reasonDescription: 'Automatically expired — lease end date has passed.',
        })
      });
    });

    it('succeeds from PENDING_TERMINATION_APPROVAL with override reason', async () => {
      const lease = getMockLease(LeaseStatus.PENDING_TERMINATION_APPROVAL);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({ status: LeaseStatus.EXPIRED } as any);

      await service.expireLease(leaseId);
      
      expect(prisma.leaseStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newStatus: LeaseStatus.EXPIRED,
          reasonDescription: 'Automatically expired (overriding pending termination request).',
        })
      });
    });
  });

  describe('8. rejectTermination revert', () => {
    it('reverts status to ACTIVE and keeps OCCUPIED', async () => {
      const lease = getMockLease(LeaseStatus.PENDING_TERMINATION_APPROVAL);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      
      // The concurrency guard inside persistTransition for ACTIVE
      jest.spyOn(prisma.lease, 'findFirst')
        .mockResolvedValueOnce(lease as any) // current
        .mockResolvedValueOnce(null as any); // overlap

      jest.spyOn(prisma.lease, 'update').mockResolvedValue({ status: LeaseStatus.ACTIVE } as any);

      const result = await service.rejectTermination(leaseId, landlordUser);
      expect(result.status).toBe(LeaseStatus.ACTIVE);

      expect(prisma.unit.update).toHaveBeenCalledWith({
        where: { id: unitId },
        data: { occupancyStatus: UnitOccupancyStatus.OCCUPIED },
      });
    });
  });
});
