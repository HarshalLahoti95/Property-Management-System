import { Test, TestingModule } from '@nestjs/testing';
import { UnitController } from '../unit.controller';
import { UnitService } from '../unit.service';
import { UnitOccupancyStatus } from '@prisma/client';

describe('UnitController', () => {
  let controller: UnitController;
  let service: UnitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitController],
      providers: [
        {
          provide: UnitService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'unit-1' }),
            findAll: jest.fn().mockResolvedValue({ data: [] }),
            findOne: jest.fn().mockResolvedValue({ id: 'unit-1' }),
            update: jest.fn().mockResolvedValue({ id: 'unit-1' }),
            remove: jest.fn().mockResolvedValue({ id: 'unit-1', deletedAt: new Date() }),
          },
        },
      ],
    }).compile();

    controller = module.get<UnitController>(UnitController);
    service = module.get<UnitService>(UnitService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call unitService.create', async () => {
      const dto = {
        unitNumber: '101',
        floor: 1,
        bedrooms: 2,
        bathrooms: 1,
        squareFootage: 800,
        defaultRent: 1200,
        status: UnitOccupancyStatus.VACANT,
      };
      const user = { id: 'landlord-1', role: 'LANDLORD' };
      const res = await controller.create('prop-1', dto, user);
      expect(service.create).toHaveBeenCalledWith('prop-1', dto, user);
      expect(res).toHaveProperty('id');
    });
  });
});
