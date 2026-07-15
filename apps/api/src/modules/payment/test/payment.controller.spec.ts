import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from '../payment.controller';
import { PaymentService } from '../payment.service';
import { PaymentRepository } from '../payment.repository';
import { DepositReturnService } from '../deposit-return.service';
import { UserRole } from '@prisma/client';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockUser = { id: 'user-1', role: UserRole.LANDLORD };
  const mockPayment = { id: 'payment-1', amount: 1200.00 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockPayment),
            findAll: jest.fn().mockResolvedValue({ data: [mockPayment], meta: {} }),
            findHistory: jest.fn().mockResolvedValue([]),
            refund: jest.fn().mockResolvedValue({ ...mockPayment, status: 'REFUNDED' }),
          },
        },
        {
          provide: PaymentRepository,
          useValue: {},
        },
        {
          provide: DepositReturnService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });



  describe('findOne', () => {
    it('should invoke findOne service method', async () => {
      const result = await controller.findOne('payment-1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('payment-1', mockUser);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('findAll', () => {
    it('should invoke findAll service method', async () => {
      const query = { page: 1, limit: 10 };
      const result = await controller.findAll(query, mockUser);
      expect(service.findAll).toHaveBeenCalledWith(query, mockUser);
      expect(result.data).toEqual([mockPayment]);
    });
  });

  describe('findHistory', () => {
    it('should invoke findHistory service method', async () => {
      const result = await controller.findHistory('payment-1', mockUser);
      expect(service.findHistory).toHaveBeenCalledWith('payment-1', mockUser);
      expect(result).toEqual([]);
    });
  });

  describe('refund', () => {
    it('should invoke refund service method', async () => {
      const dto = { amount: 1200.00, reason: 'Overpayment' };
      const result = await controller.refund('payment-1', dto, mockUser);
      expect(service.refund).toHaveBeenCalledWith('payment-1', dto, mockUser);
      expect(result.status).toBe('REFUNDED');
    });
  });
});
