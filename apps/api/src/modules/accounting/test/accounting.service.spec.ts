import { Test, TestingModule } from '@nestjs/testing';
import { AccountingService } from '../accounting.service';
import { AccountingRepository } from '../accounting.repository';
import { PrismaService } from '../../../database/prisma.service';
import { ChargeStatus, ChargeType, LedgerType, UserRole } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('AccountingService', () => {
  let service: AccountingService;
  let repository: AccountingRepository;
  let prisma: PrismaService;

  const landlordUser = { id: 'landlord-1', role: UserRole.LANDLORD };
  const tenantUser = { id: 'tenant-1', role: UserRole.TENANT };

  const mockLedger = {
    id: 'ledger-1',
    leaseId: 'lease-1',
    ledgerType: LedgerType.OPERATING,
    runningBalance: new Prisma.Decimal(100.00),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrustLedger = {
    id: 'ledger-2',
    leaseId: 'lease-1',
    ledgerType: LedgerType.TRUST,
    runningBalance: new Prisma.Decimal(0.00),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCharge = {
    id: 'charge-1',
    ledgerId: 'ledger-1',
    amount: new Prisma.Decimal(100.00),
    paidAmount: new Prisma.Decimal(0.00),
    status: ChargeStatus.UNPAID,
    type: ChargeType.RENT,
    dueDate: new Date(),
    ledger: {
      leaseId: 'lease-1',
      runningBalance: new Prisma.Decimal(100.00),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        {
          provide: AccountingRepository,
          useValue: {
            validateLeaseAccess: jest.fn().mockImplementation(async () => {}),
            findLedgersByLeaseId: jest.fn().mockResolvedValue([mockLedger, mockTrustLedger]),
            findLedgerById: jest.fn().mockResolvedValue(mockLedger),
            findChargeById: jest.fn().mockResolvedValue(mockCharge),
            findHistory: jest.fn(),
            countHistory: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((cb) => cb(prisma)),
            lease: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            financialLedger: {
              create: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn(),
              findUniqueOrThrow: jest.fn(),
            },
            rentCharge: {
              create: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn().mockResolvedValue([mockCharge]),
            },
            ledgerBalanceHistory: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
    repository = module.get<AccountingRepository>(AccountingRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeLedgers', () => {
    it('should explicitly create ledgers and deposit charge', async () => {
      jest.spyOn(prisma.lease, 'findUnique').mockResolvedValueOnce({
        id: 'lease-1',
        securityDeposit: new Prisma.Decimal(1500),
        startDate: new Date(),
      } as any);
      jest.spyOn(prisma.financialLedger, 'create')
        .mockResolvedValueOnce({ id: 'op-ledger-uuid', runningBalance: new Prisma.Decimal(0.00) } as any)
        .mockResolvedValueOnce({ id: 'trust-ledger-uuid', runningBalance: new Prisma.Decimal(0.00) } as any);
      jest.spyOn(prisma.rentCharge, 'create').mockResolvedValueOnce({ id: 'dep-charge-uuid' } as any);

      await service.initializeLedgers('lease-1');
      expect(prisma.lease.findUnique).toHaveBeenCalledWith({ where: { id: 'lease-1', deletedAt: null } });
      expect(prisma.financialLedger.create).toHaveBeenCalledTimes(2);
      expect(prisma.rentCharge.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if lease does not exist', async () => {
      jest.spyOn(prisma.lease, 'findUnique').mockResolvedValueOnce(null);
      await expect(service.initializeLedgers('lease-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLeaseSummary', () => {
    it('should compute balances, counts, and outstanding charges', async () => {
      const summary = await service.getLeaseSummary('lease-1', landlordUser);
      expect(repository.validateLeaseAccess).toHaveBeenCalledWith('lease-1', landlordUser);
      expect(summary.operatingBalance).toBe(100.00);
      expect(summary.trustBalance).toBe(0.00);
      expect(summary.outstandingCharges).toHaveLength(1);
      expect(summary.chargeCounts[ChargeStatus.UNPAID]).toBe(1);
    });
  });

  describe('createCharge', () => {
    it('should reject charge creation by tenants', async () => {
      await expect(
        service.createCharge(
          {
            leaseId: 'lease-1',
            type: ChargeType.UTILITY,
            amount: 50.00,
            dueDate: '2026-07-05T00:00:00.000Z',
            description: 'Water bill',
          },
          tenantUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a manual charge and atomically increment running balance', async () => {
      jest.spyOn(prisma.financialLedger, 'findFirst').mockResolvedValueOnce(mockLedger as any);
      jest.spyOn(prisma.rentCharge, 'create').mockResolvedValueOnce(mockCharge as any);

      const result = await service.createCharge(
        {
          leaseId: 'lease-1',
          type: ChargeType.UTILITY,
          amount: 100.00,
          dueDate: '2026-07-05T00:00:00.000Z',
          description: 'Water bill',
        },
        landlordUser,
      );

      expect(prisma.financialLedger.update).toHaveBeenCalledWith({
        where: { id: mockLedger.id },
        data: { runningBalance: expect.any(Prisma.Decimal) },
      });
      expect(result).toBeDefined();
    });
  });

  describe('voidCharge', () => {
    it('should successfully void an unpaid charge', async () => {
      const activeUnpaidCharge = {
        ...mockCharge,
        status: ChargeStatus.UNPAID,
        paidAmount: new Prisma.Decimal(0.00),
      };
      jest.spyOn(repository, 'findChargeById').mockResolvedValueOnce(activeUnpaidCharge as any);
      jest.spyOn(prisma.rentCharge, 'update').mockResolvedValueOnce({
        ...activeUnpaidCharge,
        status: ChargeStatus.VOIDED,
      } as any);

      const result = await service.voidCharge('charge-1', landlordUser);
      expect(prisma.rentCharge.update).toHaveBeenCalledWith({
        where: { id: 'charge-1' },
        data: { status: ChargeStatus.VOIDED },
      });
      expect(result.status).toBe(ChargeStatus.VOIDED);
    });
  });

  describe('adjustCharge', () => {
    it('should apply credit adjustment directly to ledger and write VOID history', async () => {
      jest.spyOn(prisma.financialLedger, 'findUniqueOrThrow').mockResolvedValueOnce(mockLedger as any);
      jest.spyOn(prisma.rentCharge, 'update').mockResolvedValueOnce({
        ...mockCharge,
        amount: new Prisma.Decimal(80.00),
      } as any);

      const result = await service.adjustCharge('charge-1', { amount: 20.00, description: 'Credit Adjustment' }, landlordUser);
      
      expect(prisma.financialLedger.update).toHaveBeenCalledWith({
        where: { id: mockLedger.id },
        data: { runningBalance: expect.any(Prisma.Decimal) },
      });
      expect(prisma.ledgerBalanceHistory.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
