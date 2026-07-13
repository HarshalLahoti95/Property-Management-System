import { Test, TestingModule } from '@nestjs/testing';
import { PropertyService } from '../property.service';
import { PropertyRepository } from '../property.repository';
import { PropertyType, UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

describe('PropertyService', () => {
  let service: PropertyService;
  let repository: PropertyRepository;

  const mockProperty = {
    id: 'prop-1',
    name: 'Heights Apartments',
    type: PropertyType.RESIDENTIAL,
    streetAddress: '123 Pine St',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    landlordId: 'landlord-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const landlordUser = {
    id: 'landlord-1',
    role: UserRole.LANDLORD,
  };

  const otherLandlordUser = {
    id: 'landlord-2',
    role: UserRole.LANDLORD,
  };

  const adminUser = {
    id: 'admin-1',
    role: UserRole.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: PropertyRepository,
          useValue: {
            create: jest.fn(),
            findActiveMany: jest.fn(),
            countActive: jest.fn(),
            findActiveById: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getDashboardMetrics: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        }
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
    repository = module.get<PropertyRepository>(PropertyRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should associate property with calling landlord', async () => {
      const dto = {
        name: 'Heights Apartments',
        type: PropertyType.RESIDENTIAL,
        streetAddress: '123 Pine St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
      };

      jest.spyOn(repository, 'create').mockResolvedValue(mockProperty as any);

      const result = await service.create(dto, landlordUser);

      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        landlordId: landlordUser.id,
      });
      expect(result).toEqual(mockProperty);
    });

    it('should allow admin to specify landlordId', async () => {
      const dto = {
        name: 'Heights Apartments',
        type: PropertyType.RESIDENTIAL,
        streetAddress: '123 Pine St',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        landlordId: 'landlord-custom',
      };

      jest.spyOn(repository, 'create').mockResolvedValue({ ...mockProperty, landlordId: 'landlord-custom' } as any);

      await service.create(dto, adminUser);

      expect(repository.create).toHaveBeenCalledWith({
        name: dto.name,
        type: dto.type,
        streetAddress: dto.streetAddress,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        landlordId: 'landlord-custom',
      });
    });
  });

  describe('findOne', () => {
    it('should successfully return owned property to landlord', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(mockProperty as any);

      const result = await service.findOne('prop-1', landlordUser);
      expect(result).toEqual(mockProperty);
    });

    it('should throw ForbiddenException if landlord does not own the property', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(mockProperty as any);

      await expect(service.findOne('prop-1', otherLandlordUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if property does not exist', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(null);

      await expect(service.findOne('nonexistent', landlordUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should perform soft delete', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(mockProperty as any);
      jest.spyOn(repository, 'softDelete').mockResolvedValue({ ...mockProperty, deletedAt: new Date() } as any);

      const result = await service.remove('prop-1', landlordUser);
      expect(repository.softDelete).toHaveBeenCalledWith('prop-1');
      expect(result.deletedAt).toBeDefined();
    });
  });
});
