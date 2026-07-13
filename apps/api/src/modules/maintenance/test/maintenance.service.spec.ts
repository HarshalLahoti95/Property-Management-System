import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from '../maintenance.service';
import { MaintenanceRepository } from '../maintenance.repository';
import { PrismaService } from '../../../database/prisma.service';
import { WorkOrderStatus, WorkOrderPriority, UserRole, ChargeStatus } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let repository: MaintenanceRepository;
  let prisma: PrismaService;

  const adminUser = { id: 'admin-1', role: UserRole.ADMIN };
  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const tenantUser = { id: 'tenant-1', role: UserRole.TENANT };

  const mockProperty = { id: 'prop-1', landlordId: 'landlord-1', deletedAt: null };
  const mockUnit = { id: 'unit-1', propertyId: 'prop-1', deletedAt: null };
  const mockWorkOrder = {
    id: 'wo-1',
    propertyId: 'prop-1',
    unitId: 'unit-1',
    workOrderNumber: 'WO-12345',
    title: 'Faucet Leak',
    description: 'Leaking water faucet',
    priority: WorkOrderPriority.MEDIUM,
    status: WorkOrderStatus.SUBMITTED,
    estimatedCost: null,
    actualCost: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: MaintenanceRepository,
          useValue: {
            findWorkOrderById: jest.fn().mockResolvedValue(mockWorkOrder),
            findWorkOrders: jest.fn().mockResolvedValue([mockWorkOrder]),
            countWorkOrders: jest.fn().mockResolvedValue(1),
            findHistoryByWorkOrderId: jest.fn().mockResolvedValue([]),
            findCommentsByWorkOrderId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((cb) => cb(prisma)),
            property: {
              findFirst: jest.fn().mockResolvedValue(mockProperty),
              findUnique: jest.fn().mockResolvedValue(mockProperty),
            },
            unit: {
              findFirst: jest.fn().mockResolvedValue(mockUnit),
            },
            lease: {
              findFirst: jest.fn().mockResolvedValue({ id: 'lease-1' }),
            },
            workOrder: {
              create: jest.fn().mockResolvedValue(mockWorkOrder),
              update: jest.fn(),
            },
            workOrderStatusHistory: {
              create: jest.fn(),
            },
            workOrderComment: {
              create: jest.fn().mockResolvedValue({ id: 'comment-1' }),
            },
            vendor: {
              findFirst: jest.fn().mockResolvedValue({ id: 'vendor-1' }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    repository = module.get<MaintenanceRepository>(MaintenanceRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject creation if both propertyId and unitId are set', async () => {
      await expect(
        service.create(
          {
            propertyId: 'prop-1',
            unitId: 'unit-1',
            title: 'Repair Faucet',
            description: 'Drips water',
            priority: WorkOrderPriority.MEDIUM,
          },
          landlordUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject creation if neither propertyId nor unitId are set', async () => {
      await expect(
        service.create(
          {
            title: 'Repair Faucet',
            description: 'Drips water',
            priority: WorkOrderPriority.MEDIUM,
          },
          landlordUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create a work order and write initial history', async () => {
      const result = await service.create(
        {
          unitId: 'unit-1',
          title: 'Repair Faucet',
          description: 'Drips water',
          priority: WorkOrderPriority.MEDIUM,
        },
        landlordUser,
      );

      expect(prisma.workOrder.create).toHaveBeenCalled();
      expect(prisma.workOrderStatusHistory.create).toHaveBeenCalledWith({
        data: {
          workOrderId: mockWorkOrder.id,
          oldStatus: null,
          newStatus: WorkOrderStatus.SUBMITTED,
          changedByUserId: landlordUser.id,
          reasonDescription: 'Initial work order creation',
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('transition', () => {
    it('should transition status and record history log', async () => {
      jest.spyOn(prisma.workOrder, 'update').mockResolvedValueOnce({
        ...mockWorkOrder,
        status: WorkOrderStatus.ASSIGNED,
      } as any);

      const result = await service.transition(
        'wo-1',
        { status: WorkOrderStatus.ASSIGNED, reasonDescription: 'Assigned to plumber' },
        landlordUser,
      );

      expect(prisma.workOrder.update).toHaveBeenCalled();
      expect(prisma.workOrderStatusHistory.create).toHaveBeenCalled();
      expect(result.status).toBe(WorkOrderStatus.ASSIGNED);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      await expect(
        service.transition('wo-1', { status: WorkOrderStatus.RESOLVED }, landlordUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should reject negative estimated or actual costs', async () => {
      await expect(
        service.update('wo-1', { estimatedCost: -10 }, landlordUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject actual cost update if work order has not transitioned past ASSIGNED', async () => {
      await expect(
        service.update('wo-1', { actualCost: 120.00 }, landlordUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
