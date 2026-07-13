import { Test, TestingModule } from '@nestjs/testing';
import { AccountingController } from '../accounting.controller';
import { AccountingService } from '../accounting.service';
import { UserRole } from '@prisma/client';

describe('AccountingController', () => {
  let controller: AccountingController;
  let service: AccountingService;

  const mockUser = { id: 'user-1', role: UserRole.LANDLORD };
  const mockLedger = { id: 'ledger-1', leaseId: 'lease-1' };
  const mockCharge = { id: 'charge-1', amount: 150 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountingController],
      providers: [
        {
          provide: AccountingService,
          useValue: {
            findLedgersByLeaseId: jest.fn().mockResolvedValue([mockLedger]),
            getLeaseSummary: jest.fn().mockResolvedValue({ success: true }),
            findLedgerHistory: jest.fn().mockResolvedValue({ data: [], meta: {} }),
            createCharge: jest.fn().mockResolvedValue(mockCharge),
            findAllCharges: jest.fn().mockResolvedValue({ data: [], meta: {} }),
            voidCharge: jest.fn().mockResolvedValue({ ...mockCharge, status: 'VOIDED' }),
            adjustCharge: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountingController>(AccountingController);
    service = module.get<AccountingService>(AccountingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findLedgersByLeaseId', () => {
    it('should invoke findLedgersByLeaseId service method', async () => {
      const result = await controller.findLedgersByLeaseId('lease-1', mockUser);
      expect(service.findLedgersByLeaseId).toHaveBeenCalledWith('lease-1', mockUser);
      expect(result).toEqual([mockLedger]);
    });
  });

  describe('getLeaseSummary', () => {
    it('should invoke getLeaseSummary service method', async () => {
      const result = await controller.getLeaseSummary('lease-1', mockUser);
      expect(service.getLeaseSummary).toHaveBeenCalledWith('lease-1', mockUser);
      expect(result).toEqual({ success: true });
    });
  });

  describe('createCharge', () => {
    it('should invoke createCharge service method with correct dto', async () => {
      const dto = {
        leaseId: 'lease-1',
        type: 'UTILITY' as any,
        amount: 150.00,
        dueDate: '2026-07-05T00:00:00.000Z',
        description: 'Utility charge',
      };
      const result = await controller.createCharge(dto, mockUser);
      expect(service.createCharge).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockCharge);
    });
  });

  describe('voidCharge', () => {
    it('should invoke voidCharge service method', async () => {
      const result = await controller.voidCharge('charge-1', mockUser);
      expect(service.voidCharge).toHaveBeenCalledWith('charge-1', mockUser);
      expect(result.status).toBe('VOIDED');
    });
  });

  describe('adjustCharge', () => {
    it('should invoke adjustCharge service method', async () => {
      const dto = { amount: 20.00, description: 'Adjust' };
      const result = await controller.adjustCharge('charge-1', dto, mockUser);
      expect(service.adjustCharge).toHaveBeenCalledWith('charge-1', dto, mockUser);
      expect(result).toEqual({ success: true });
    });
  });
});
