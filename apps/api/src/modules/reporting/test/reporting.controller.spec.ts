import { Test, TestingModule } from '@nestjs/testing';
import { ReportingController } from '../reporting.controller';
import { ReportingService } from '../reporting.service';
import { UserRole } from '@prisma/client';

describe('ReportingController', () => {
  let controller: ReportingController;
  let service: ReportingService;

  const mockUser = { id: 'user-1', role: UserRole.LANDLORD };
  const mockSummary = { occupancyRate: 90 };
  const mockCsv = 'Header1,Header2\nData1,Data2';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        {
          provide: ReportingService,
          useValue: {
            getSummary: jest.fn().mockResolvedValue(mockSummary),
            getOccupancy: jest.fn().mockResolvedValue({}),
            getFinancials: jest.fn().mockResolvedValue({}),
            getMaintenance: jest.fn().mockResolvedValue({}),
            exportLeases: jest.fn().mockResolvedValue(mockCsv),
            exportFinancials: jest.fn().mockResolvedValue(mockCsv),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportingController>(ReportingController);
    service = module.get<ReportingService>(ReportingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should invoke getSummary service method', async () => {
      const result = await controller.getSummary(mockUser);
      expect(service.getSummary).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockSummary);
    });
  });

  describe('getOccupancy', () => {
    it('should invoke getOccupancy service method', async () => {
      const result = await controller.getOccupancy(mockUser);
      expect(service.getOccupancy).toHaveBeenCalledWith(mockUser);
      expect(result).toBeDefined();
    });
  });

  describe('exportLeases', () => {
    it('should invoke exportLeases service method and write stream headers', async () => {
      const mockRes: any = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      await controller.exportLeases(mockRes, mockUser);
      expect(service.exportLeases).toHaveBeenCalledWith(mockUser);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.send).toHaveBeenCalledWith(mockCsv);
    });
  });
});
