import { Test, TestingModule } from '@nestjs/testing';
import { LeaseController } from '../lease.controller';
import { LeaseService } from '../lease.service';
import { LeaseStatusService } from '../lease-status.service';
import { LeaseStatus } from '@prisma/client';

describe('LeaseController', () => {
  let controller: LeaseController;
  let service: LeaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaseController],
      providers: [
        {
          provide: LeaseService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'lease-1' }),
            findAll: jest.fn().mockResolvedValue({ data: [] }),
            findOne: jest.fn().mockResolvedValue({ id: 'lease-1' }),
            update: jest.fn().mockResolvedValue({ id: 'lease-1' }),
            transition: jest.fn().mockResolvedValue({ id: 'lease-1', status: LeaseStatus.PENDING_TENANT_SIGNATURE }),
            remove: jest.fn().mockResolvedValue({ id: 'lease-1', deletedAt: new Date() }),
          },
        },
        {
          provide: LeaseStatusService,
          useValue: {
            approveLease: jest.fn(),
            submitForTenantSignature: jest.fn(),
            signLease: jest.fn(),
            declineLease: jest.fn(),
            requestTermination: jest.fn(),
            approveTermination: jest.fn(),
            rejectTermination: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LeaseController>(LeaseController);
    service = module.get<LeaseService>(LeaseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call leaseService.create', async () => {
      const dto = {
        unitId: 'unit-1',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2027-07-01T00:00:00.000Z',
        monthlyRent: 1500,
        securityDeposit: 1500,
        rentDueDay: 1,
        gracePeriodDays: 5,
        tenantIds: ['tenant-1'],
      };
      const user = { id: 'landlord-1', role: 'LANDLORD' };
      const res = await controller.create(dto, user);
      expect(service.create).toHaveBeenCalledWith(dto, user);
      expect(res).toHaveProperty('id');
    });
  });
});
