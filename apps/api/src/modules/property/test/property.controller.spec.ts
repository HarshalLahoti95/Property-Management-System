import { Test, TestingModule } from '@nestjs/testing';
import { PropertyController } from '../property.controller';
import { PropertyService } from '../property.service';
import { PropertyType } from '@prisma/client';

describe('PropertyController', () => {
  let controller: PropertyController;
  let service: PropertyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [
        {
          provide: PropertyService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'prop-1' }),
            findAll: jest.fn().mockResolvedValue({ data: [] }),
            findOne: jest.fn().mockResolvedValue({ id: 'prop-1' }),
            update: jest.fn().mockResolvedValue({ id: 'prop-1' }),
            remove: jest.fn().mockResolvedValue({ id: 'prop-1', deletedAt: new Date() }),
            getDashboard: jest.fn().mockResolvedValue({ totalUnits: 0 }),
          },
        },
      ],
    }).compile();

    controller = module.get<PropertyController>(PropertyController);
    service = module.get<PropertyService>(PropertyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call propertyService.create', async () => {
      const dto = {
        name: 'Apartments',
        type: PropertyType.RESIDENTIAL,
        streetAddress: '123 St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
      };
      const user = { id: 'landlord-1', role: 'LANDLORD' };
      const res = await controller.create(dto, user);
      expect(service.create).toHaveBeenCalledWith(dto, user);
      expect(res).toHaveProperty('id');
    });
  });
});
