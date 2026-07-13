import { Test, TestingModule } from '@nestjs/testing';
import { LeaseService } from '../lease.service';
import { LeaseRepository } from '../lease.repository';
import { PrismaService } from '../../../database/prisma.service';
import { LeaseStatus, UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AccountingService } from '../../accounting/accounting.service';
import { NotificationEventBus } from '../../notification/notification.service';
import { LeaseStatusService } from '../lease-status.service';
import { LeaseDocumentGeneratorService } from '../services/lease-document-generator.service';

describe('LeaseService', () => {
  let service: LeaseService;
  let repository: LeaseRepository;
  let prisma: PrismaService;

  const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const otherLandlord = { id: 'landlord-2', role: UserRole.LANDLORD };
  const tenantUser = { id: 'tenant-1', role: UserRole.TENANT, status: 'ACTIVE', deletedAt: null };

  const mockUnit = {
    id: 'unit-1',
    propertyId: 'prop-1',
    landlordId: 'landlord-1',
    occupancyStatus: 'VACANT',
    deletedAt: null,
    property: {
      landlordId: 'landlord-1',
    },
  };

  const makeAdminLease = (statusOverride?: LeaseStatus) => ({
    id: 'lease-1',
    unitId: 'unit-1',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2027-07-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    rentDueDay: 1,
    gracePeriodDays: 5,
    status: statusOverride || LeaseStatus.DRAFT,
    createdByRole: UserRole.ADMIN,
    unit: {
      landlordId: 'landlord-1',
      landlord: { id: 'landlord-1', email: 'landlord@test.com', fullName: 'Landlord' },
      property: { landlordId: 'landlord-1' },
    },
    leaseTenants: [{ tenantId: tenantUser.id, tenant: { id: tenantUser.id, email: 'tenant@test.com', fullName: 'Tenant' } }],
  });

  const makeLandlordLease = (statusOverride?: LeaseStatus) => ({
    id: 'lease-2',
    unitId: 'unit-1',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2027-07-01'),
    monthlyRent: 1500,
    securityDeposit: 1500,
    rentDueDay: 1,
    gracePeriodDays: 5,
    status: statusOverride || LeaseStatus.DRAFT,
    createdByRole: UserRole.LANDLORD,
    unit: {
      landlordId: 'landlord-1',
      landlord: { id: 'landlord-1', email: 'landlord@test.com', fullName: 'Landlord' },
      property: { landlordId: 'landlord-1' },
    },
    leaseTenants: [{ tenantId: tenantUser.id, tenant: { id: tenantUser.id, email: 'tenant@test.com', fullName: 'Tenant' } }],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaseService,
        {
          provide: LeaseRepository,
          useValue: {
            createLease: jest.fn(),
            findActiveById: jest.fn(),
            findActiveMany: jest.fn(),
            countActive: jest.fn(),
            updateStatusWithHistory: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            unit: {
              findFirst: jest.fn(),
            },
            user: {
              findMany: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            lease: {
              update: jest.fn(),
            },
            leaseTenant: {
              deleteMany: jest.fn(),
              create: jest.fn(),
            },
            leaseDocument: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AccountingService,
          useValue: { initializeLedgers: jest.fn() },
        },
        {
          provide: NotificationEventBus,
          useValue: { emit: jest.fn(), on: jest.fn() },
        },
        {
          provide: LeaseStatusService,
          useValue: { createDraft: jest.fn(), submitForLandlordApproval: jest.fn() },
        },
        // Mocked to resolve cleanly so we test lease logic, not document generation failure handling
        {
          provide: LeaseDocumentGeneratorService,
          useValue: { generateDocument: jest.fn().mockResolvedValue(undefined) },
        }
      ],
    }).compile();

    service = module.get<LeaseService>(LeaseService);
    repository = module.get<LeaseRepository>(LeaseRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if end date is not after start date', async () => {
      jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue(mockUnit as any);
      jest.spyOn(prisma.user, 'findMany').mockResolvedValue([tenantUser] as any);

      const dto = {
        unitId: 'unit-1',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-06-30T00:00:00.000Z',
        monthlyRent: 1000,
        securityDeposit: 1000,
        rentDueDay: 1,
        gracePeriodDays: 5,
        tenantIds: ['tenant-1'],
      };

      await expect(service.create(dto, landlordUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if landlord does not own unit property', async () => {
      jest.spyOn(prisma.unit, 'findFirst').mockResolvedValue(mockUnit as any);

      const dto = {
        unitId: 'unit-1',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2027-07-01T00:00:00.000Z',
        monthlyRent: 1000,
        securityDeposit: 1000,
        rentDueDay: 1,
        gracePeriodDays: 5,
        tenantIds: ['tenant-1'],
      };

      await expect(service.create(dto, otherLandlord)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDocuments', () => {
    it('should return ordered documents for an authorized user', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(makeLandlordLease() as any);
      jest.spyOn(prisma.leaseDocument, 'findMany').mockResolvedValue([
        { purpose: 'EXECUTED', document: { id: 'doc-1', fileName: 'exec.pdf', createdAt: new Date() } },
        { purpose: 'DRAFT_PREVIEW', document: { id: 'doc-2', fileName: 'draft.pdf', createdAt: new Date() } },
      ] as any);

      const result = await service.getDocuments('lease-2', landlordUser);
      
      expect(result).toHaveLength(2);
      expect(result[0].purpose).toBe('EXECUTED');
      expect(result[0].downloadUrl).toBe('/api/documents/doc-1/stream');
    });

    it('should reject a tenant trying to view another tenant\'s lease documents', async () => {
      // makeLandlordLease() returns a lease where the tenant is 'tenant-1'
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(makeLandlordLease() as any);
      
      const otherTenantUser = { id: 'tenant-99', role: UserRole.TENANT };
      
      await expect(service.getDocuments('lease-2', otherTenantUser)).rejects.toThrow(ForbiddenException);
    });
  });

});
