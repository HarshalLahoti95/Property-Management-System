import { Test, TestingModule } from '@nestjs/testing';
import { LeaseStatusService } from '../lease-status.service';
import { LeaseRepository } from '../lease.repository';
import { PrismaService } from '../../../database/prisma.service';
import { LeaseStatus, UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { NotificationEventBus } from '../../notification/notification.service';
import { LeaseDocumentGeneratorService } from '../services/lease-document-generator.service';

describe('LeaseStatusService', () => {
  let service: LeaseStatusService;
  let repository: LeaseRepository;
  let prisma: PrismaService;

  const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const tenantUser = { id: 'tenant-1', role: UserRole.TENANT, status: 'ACTIVE', deletedAt: null };

  const makeAdminLease = (statusOverride?: LeaseStatus) => ({
    id: 'lease-1',
    unitId: 'unit-1',
    status: statusOverride || LeaseStatus.DRAFT,
    createdByUserId: adminUser.id,
    unit: {
      landlordId: 'landlord-1',
      landlord: { id: 'landlord-1', email: 'landlord@test.com', fullName: 'Landlord' },
    },
    leaseTenants: [{ id: 'lt-1', tenantId: tenantUser.id, status: 'PENDING', tenant: { id: tenantUser.id, email: 'tenant@test.com', fullName: 'Tenant' } }],
  });

  const makeLandlordLease = (statusOverride?: LeaseStatus) => ({
    id: 'lease-2',
    unitId: 'unit-1',
    status: statusOverride || LeaseStatus.DRAFT,
    createdByUserId: landlordUser.id,
    unit: {
      landlordId: 'landlord-1',
      landlord: { id: 'landlord-1', email: 'landlord@test.com', fullName: 'Landlord' },
    },
    leaseTenants: [{ id: 'lt-2', tenantId: tenantUser.id, status: 'PENDING', tenant: { id: tenantUser.id, email: 'tenant@test.com', fullName: 'Tenant' } }],
  });

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
            lease: {
              update: jest.fn().mockImplementation(({ data }) => data),
              findFirst: jest.fn(),
            },
            unit: {
              update: jest.fn(),
            },
            leaseTenant: {
              update: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
            leaseStatusHistory: {
              create: jest.fn(),
            }
          },
        },
        {
          provide: NotificationEventBus,
          useValue: { emit: jest.fn(), on: jest.fn() },
        },
        // Mocked to resolve cleanly so we test lease logic, not document generation failure handling
        {
          provide: LeaseDocumentGeneratorService,
          useValue: { generateDocument: jest.fn().mockResolvedValue(undefined) },
        }
      ],
    }).compile();

    service = module.get<LeaseStatusService>(LeaseStatusService);
    repository = module.get<LeaseRepository>(LeaseRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('transition — Admin-created lease', () => {
    it('should allow admin to transition DRAFT → PENDING_LANDLORD_APPROVAL', async () => {
      const lease = makeAdminLease();
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.PENDING_LANDLORD_APPROVAL,
      } as any);

      const result = await service.submitForLandlordApproval('lease-1', adminUser);
      expect(result.status).toBe(LeaseStatus.PENDING_LANDLORD_APPROVAL);
    });

    it('should block landlord from transitioning admin-created DRAFT → PENDING_LANDLORD_APPROVAL', async () => {
      const lease = makeAdminLease();
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      await expect(service.submitForLandlordApproval('lease-1', landlordUser)).rejects.toThrow(ForbiddenException);
    });

    it('should block admin from transitioning admin-created DRAFT → PENDING_TENANT_SIGNATURE', async () => {
      const lease = makeAdminLease();
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      await expect(service.submitForTenantSignature('lease-1', adminUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow landlord to approve PENDING_LANDLORD_APPROVAL → PENDING_TENANT_SIGNATURE', async () => {
      const lease = makeAdminLease(LeaseStatus.PENDING_LANDLORD_APPROVAL);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.PENDING_TENANT_SIGNATURE,
      } as any);

      const result = await service.approveLease('lease-1', landlordUser);
      expect(result.status).toBe(LeaseStatus.PENDING_TENANT_SIGNATURE);
    });

    it('should allow landlord to reject PENDING_LANDLORD_APPROVAL → REJECTED', async () => {
      const lease = makeAdminLease(LeaseStatus.PENDING_LANDLORD_APPROVAL);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.REJECTED,
      } as any);

      const result = await service.rejectLease('lease-1', landlordUser);
      expect(result.status).toBe(LeaseStatus.REJECTED);
    });
  });

  describe('transition — Landlord-created lease', () => {
    it('should allow landlord to transition DRAFT → PENDING_TENANT_SIGNATURE', async () => {
      const lease = makeLandlordLease();
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.PENDING_TENANT_SIGNATURE,
      } as any);

      const result = await service.submitForTenantSignature('lease-2', landlordUser);
      expect(result.status).toBe(LeaseStatus.PENDING_TENANT_SIGNATURE);
    });

    it('should block admin from transitioning landlord-created DRAFT → PENDING_TENANT_SIGNATURE', async () => {
      const lease = makeLandlordLease();
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      await expect(service.submitForTenantSignature('lease-2', adminUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transition — Tenant actions', () => {
    it('should allow tenant to sign PENDING_TENANT_SIGNATURE → ACTIVE', async () => {
      const lease = makeLandlordLease(LeaseStatus.PENDING_TENANT_SIGNATURE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'findFirst')
        .mockResolvedValueOnce(lease as any)
        .mockResolvedValueOnce(null as any);
      jest.spyOn(prisma.leaseTenant, 'findMany').mockResolvedValue([{ signedAt: new Date() }] as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.ACTIVE,
      } as any);

      const result = await service.signLease('lease-2', tenantUser);
      expect(result.status).toBe(LeaseStatus.ACTIVE);
    });

    it('should allow tenant to decline PENDING_TENANT_SIGNATURE → DECLINED', async () => {
      const lease = makeLandlordLease(LeaseStatus.PENDING_TENANT_SIGNATURE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.DECLINED,
      } as any);

      const result = await service.declineLease('lease-2', tenantUser);
      expect(result.status).toBe(LeaseStatus.DECLINED);
    });

    it('should block landlord from signing PENDING_TENANT_SIGNATURE → ACTIVE', async () => {
      const lease = makeLandlordLease(LeaseStatus.PENDING_TENANT_SIGNATURE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      await expect(service.signLease('lease-2', landlordUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transition — Termination workflow', () => {
    it('should allow admin to request ACTIVE → PENDING_TERMINATION_APPROVAL', async () => {
      const lease = makeLandlordLease(LeaseStatus.ACTIVE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.PENDING_TERMINATION_APPROVAL,
      } as any);

      const result = await service.requestTermination('lease-2', adminUser);
      expect(result.status).toBe(LeaseStatus.PENDING_TERMINATION_APPROVAL);
    });

    it('should allow landlord to approve PENDING_TERMINATION_APPROVAL → TERMINATED', async () => {
      const lease = makeLandlordLease(LeaseStatus.PENDING_TERMINATION_APPROVAL);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      jest.spyOn(prisma.lease, 'update').mockResolvedValue({
        ...lease,
        status: LeaseStatus.TERMINATED,
      } as any);

      const result = await service.approveTermination('lease-2', landlordUser);
      expect(result.status).toBe(LeaseStatus.TERMINATED);
    });

    it('should block tenant from requesting ACTIVE → PENDING_TERMINATION_APPROVAL', async () => {
      const lease = makeLandlordLease(LeaseStatus.ACTIVE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      await expect(service.requestTermination('lease-2', tenantUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transition — Invalid transitions', () => {
    it('should block direct DRAFT → ACTIVE', async () => {
      const lease = makeAdminLease();
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      await expect(service.transitionDispatcher('lease-1', { status: LeaseStatus.ACTIVE }, landlordUser)).rejects.toThrow(BadRequestException);
    });

    it('should block manual ACTIVE → EXPIRED', async () => {
      const lease = makeLandlordLease(LeaseStatus.ACTIVE);
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(lease as any);
      await expect(service.transitionDispatcher('lease-2', { status: LeaseStatus.EXPIRED }, landlordUser)).rejects.toThrow(BadRequestException);
    });
  });
});
