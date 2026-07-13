import { Test, TestingModule } from '@nestjs/testing';
import { UnitService } from '../unit.service';
import { UnitRepository } from '../unit.repository';
import { PrismaService } from '../../../database/prisma.service';
import { UnitOccupancyStatus, UserRole } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('UnitService', () => {
  let service: UnitService;
  let repository: UnitRepository;
  let prisma: PrismaService;

  const mockProperty = {
    id: 'prop-1',
    landlordId: 'landlord-1',
    deletedAt: null,
  };

  const mockUnit = {
    id: 'unit-1',
    propertyId: 'prop-1',
    unitNumber: '101',
    floorLevel: 1,
    bedCount: 2,
    bathCount: 1,
    squareFootage: 800,
    targetRent: 1200,
    occupancyStatus: UnitOccupancyStatus.VACANT,
    deletedAt: null,
    property: {
      landlordId: 'landlord-1',
    },
  };

  const landlordUser = {
    id: 'landlord-1',
    role: UserRole.LANDLORD,
  };

  const otherLandlordUser = {
    id: 'landlord-2',
    role: UserRole.LANDLORD,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitService,
        {
          provide: UnitRepository,
          useValue: {
            create: jest.fn(),
            findActiveManyByPropertyId: jest.fn(),
            countActive: jest.fn(),
            findActiveById: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            property: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UnitService>(UnitService);
    repository = module.get<UnitRepository>(UnitRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create unit when landlord owns property', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);
      jest.spyOn(repository, 'create').mockResolvedValue(mockUnit as any);

      const dto = {
        unitNumber: '101',
        floor: 1,
        bedrooms: 2,
        bathrooms: 1,
        squareFootage: 800,
        defaultRent: 1200,
        status: UnitOccupancyStatus.VACANT,
      };

      const result = await service.create('prop-1', dto, landlordUser);

      expect(prisma.property.findFirst).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith({
        propertyId: 'prop-1',
        unitNumber: dto.unitNumber,
        floorLevel: dto.floor,
        bedCount: dto.bedrooms,
        bathCount: dto.bathrooms,
        squareFootage: dto.squareFootage,
        targetRent: dto.defaultRent,
        occupancyStatus: dto.status,
      });
      expect(result).toEqual(mockUnit);
    });

    it('should throw NotFoundException if property does not exist', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(null);

      await expect(
        service.create('nonexistent', {} as any, landlordUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if landlord does not own the property', async () => {
      jest.spyOn(prisma.property, 'findFirst').mockResolvedValue(mockProperty as any);

      await expect(
        service.create('prop-1', {} as any, otherLandlordUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return unit details when landlord owns the property associated with it', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(mockUnit as any);

      const result = await service.findOne('unit-1', landlordUser);
      expect(result).toEqual(mockUnit);
    });

    it('should throw ForbiddenException if landlord is not associated with the unit property', async () => {
      jest.spyOn(repository, 'findActiveById').mockResolvedValue(mockUnit as any);

      await expect(service.findOne('unit-1', otherLandlordUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
