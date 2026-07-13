import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceController } from '../maintenance.controller';
import { MaintenanceService } from '../maintenance.service';
import { UserRole } from '@prisma/client';

describe('MaintenanceController', () => {
  let controller: MaintenanceController;
  let service: MaintenanceService;

  const mockUser = { id: 'user-1', role: UserRole.LANDLORD };
  const mockWorkOrder = { id: 'wo-1', title: 'Faucet Leak' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        {
          provide: MaintenanceService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockWorkOrder),
            findAll: jest.fn().mockResolvedValue({ data: [mockWorkOrder], meta: {} }),
            findOne: jest.fn().mockResolvedValue(mockWorkOrder),
            update: jest.fn().mockResolvedValue(mockWorkOrder),
            transition: jest.fn().mockResolvedValue({ ...mockWorkOrder, status: 'ASSIGNED' }),
            assignVendor: jest.fn().mockResolvedValue({ ...mockWorkOrder, vendorId: 'vendor-1' }),
            createComment: jest.fn().mockResolvedValue({ id: 'comment-1' }),
            findHistory: jest.fn().mockResolvedValue([]),
            remove: jest.fn().mockResolvedValue(mockWorkOrder),
          },
        },
      ],
    }).compile();

    controller = module.get<MaintenanceController>(MaintenanceController);
    service = module.get<MaintenanceService>(MaintenanceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should invoke create service method', async () => {
      const dto = {
        unitId: 'unit-1',
        title: 'Faucet Leak',
        description: 'Drips water',
        priority: 'MEDIUM' as any,
      };
      const result = await controller.create(dto, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockWorkOrder);
    });
  });

  describe('findOne', () => {
    it('should invoke findOne service method', async () => {
      const result = await controller.findOne('wo-1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('wo-1', mockUser);
      expect(result).toEqual(mockWorkOrder);
    });
  });

  describe('findAll', () => {
    it('should invoke findAll service method', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query, mockUser);
      expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
      expect(result.data).toEqual([mockWorkOrder]);
    });
  });

  describe('update', () => {
    it('should invoke update service method', async () => {
      const dto = { title: 'New leak description' };
      const result = await controller.update('wo-1', dto, mockUser);
      expect(service.update).toHaveBeenCalledWith('wo-1', dto, mockUser);
      expect(result).toEqual(mockWorkOrder);
    });
  });

  describe('transition', () => {
    it('should invoke transition service method', async () => {
      const dto = { status: 'ASSIGNED' as any, reasonDescription: 'Assign Plumber' };
      const result = await controller.transition('wo-1', dto, mockUser);
      expect(service.transition).toHaveBeenCalledWith('wo-1', dto, mockUser);
      expect(result.status).toBe('ASSIGNED');
    });
  });

  describe('assignVendor', () => {
    it('should invoke assignVendor service method', async () => {
      const dto = { vendorId: 'vendor-1', reasonDescription: 'Assigned electrician' };
      const result = await controller.assignVendor('wo-1', dto, mockUser);
      expect(service.assignVendor).toHaveBeenCalledWith('wo-1', dto, mockUser);
      expect(result.vendorId).toBe('vendor-1');
    });
  });

  describe('createComment', () => {
    it('should invoke createComment service method', async () => {
      const dto = { body: 'New Comment' };
      const result = await controller.createComment('wo-1', dto, mockUser);
      expect(service.createComment).toHaveBeenCalledWith('wo-1', dto, mockUser);
      expect(result.id).toBe('comment-1');
    });
  });

  describe('findHistory', () => {
    it('should invoke findHistory service method', async () => {
      const result = await controller.findHistory('wo-1', mockUser);
      expect(service.findHistory).toHaveBeenCalledWith('wo-1', mockUser);
      expect(result).toEqual([]);
    });
  });
});
