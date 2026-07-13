import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../payment.service';
import { PaymentRepository } from '../payment.repository';
import { PrismaService } from '../../../database/prisma.service';
import { AccountingService } from '../../accounting/accounting.service';
import { ChargeStatus, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('PaymentService', () => {
  let service: PaymentService;
  let repository: PaymentRepository;
  let prisma: PrismaService;
  let accountingService: AccountingService;

  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const tenantUser = { id: 'tenant-1', role: UserRole.TENANT };

  const mockLedger = {
    id: 'ledger-1',
    leaseId: 'lease-1',
    ledgerType: 'OPERATING',
    runningBalance: new Prisma.Decimal(1200.00),
  };

  const mockPayment = {
    id: 'payment-1',
    ledgerId: 'ledger-1',
    tenantId: 'tenant-1',
    amount: new Prisma.Decimal(1200.00),
    paymentMethod: PaymentMethod.ACH,
    transactionReference: 'TXN-12345',
    status: PaymentStatus.CLEARED,
    paymentDate: new Date(),
  };

  const mockCharge = {
    id: 'charge-1',
    ledgerId: 'ledger-1',
    amount: new Prisma.Decimal(1000.00),
    paidAmount: new Prisma.Decimal(0.00),
    status: ChargeStatus.UNPAID,
    dueDate: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: {
            validateLedgerAccess: jest.fn().mockResolvedValue(mockLedger),
            findPaymentById: jest.fn().mockResolvedValue(mockPayment),
            findPayments: jest.fn().mockResolvedValue([mockPayment]),
            countPayments: jest.fn().mockResolvedValue(1),
            findAllocationsByPaymentId: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((cb) => cb(prisma)),
            user: {
              findFirst: jest.fn().mockResolvedValue({ id: 'tenant-1', role: UserRole.TENANT }),
            },
            payment: {
              create: jest.fn().mockResolvedValue(mockPayment),
              findUnique: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn(),
            },
            rentCharge: {
              findMany: jest.fn().mockResolvedValue([mockCharge]),
              update: jest.fn(),
            },
            paymentAllocation: {
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              delete: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: AccountingService,
          useValue: {
            handlePaymentApplied: jest.fn().mockImplementation(async () => {}),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    repository = module.get<PaymentRepository>(PaymentRepository);
    prisma = module.get<PrismaService>(PrismaService);
    accountingService = module.get<AccountingService>(AccountingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject payment creation with amount <= 0', async () => {
      await expect(
        service.create(
          {
            ledgerId: 'ledger-1',
            tenantId: 'tenant-1',
            amount: 0,
            paymentMethod: PaymentMethod.ACH,
            transactionReference: 'TXN-NEW',
            paymentDate: new Date().toISOString(),
          },
          tenantUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject payment creation if duplicate transactionReference exists', async () => {
      jest.spyOn(prisma.payment, 'findUnique').mockResolvedValueOnce(mockPayment as any);
      await expect(
        service.create(
          {
            ledgerId: 'ledger-1',
            tenantId: 'tenant-1',
            amount: 1200.00,
            paymentMethod: PaymentMethod.ACH,
            transactionReference: 'TXN-12345',
            paymentDate: new Date().toISOString(),
          },
          tenantUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allocate payment FIFO and call Accounting callback', async () => {
      jest.spyOn(prisma.payment, 'findUnique').mockResolvedValueOnce(null);
      const mockPaidCharge = { ...mockCharge, status: ChargeStatus.PAID, paidAmount: mockCharge.amount };
      jest.spyOn(prisma.rentCharge, 'update').mockResolvedValueOnce(mockPaidCharge as any);

      const result = await service.create(
        {
          ledgerId: 'ledger-1',
          tenantId: 'tenant-1',
          amount: 1200.00,
          paymentMethod: PaymentMethod.ACH,
          transactionReference: 'TXN-UNIQUE',
          paymentDate: new Date().toISOString(),
        },
        tenantUser,
      );

      expect(prisma.paymentAllocation.create).toHaveBeenCalled();
      expect(prisma.rentCharge.update).toHaveBeenCalled();
      expect(accountingService.handlePaymentApplied).toHaveBeenCalledWith('ledger-1', mockPayment.id, 1200.00);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('refund', () => {
    it('should successfully initiate full refund, reverse allocations, and send negative balance sync', async () => {
      jest.spyOn(prisma.payment, 'create').mockResolvedValueOnce({
        ...mockPayment,
        id: 'refund-1',
        amount: new Prisma.Decimal(1200.00),
        status: PaymentStatus.REFUNDED,
      } as any);

      const mockAlloc = {
        id: 'alloc-1',
        paymentId: 'payment-1',
        rentChargeId: 'charge-1',
        amountAllocated: new Prisma.Decimal(1000.00),
        rentCharge: mockCharge,
      };

      jest.spyOn(prisma.paymentAllocation, 'findMany').mockResolvedValueOnce([mockAlloc] as any);

      const result = await service.refund('payment-1', { reason: 'Tenant moved out' }, landlordUser);

      expect(prisma.payment.create).toHaveBeenCalled();
      expect(prisma.rentCharge.update).toHaveBeenCalled();
      expect(prisma.paymentAllocation.delete).toHaveBeenCalled();
      expect(accountingService.handlePaymentApplied).toHaveBeenCalledWith('ledger-1', 'refund-1', -1200.00);
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });
  });
});
