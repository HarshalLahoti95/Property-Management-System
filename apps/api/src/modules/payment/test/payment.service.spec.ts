import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from '../payment.service';
import { PaymentRepository } from '../payment.repository';
import { PrismaService } from '../../../database/prisma.service';
import { AccountingService } from '../../accounting/accounting.service';
import { ChargeService } from '../../accounting/charge.service';
import { LedgerService } from '../../accounting/ledger.service';
import { AllocationService } from '../allocation.service';
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
          useValue: {},
        },
        {
          provide: ChargeService,
          useValue: {},
        },
        {
          provide: AllocationService,
          useValue: {},
        },
        {
          provide: LedgerService,
          useValue: {},
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



  describe('refund', () => {
    it('should throw NotImplementedException for v1', async () => {
      await expect(
        service.refund('payment-1', { amount: 1200.00, reason: 'Tenant moved out' } as any, landlordUser),
      ).rejects.toThrow('Refund processing is explicitly out of scope for v1. No data will be modified.');
    });
  });
});
