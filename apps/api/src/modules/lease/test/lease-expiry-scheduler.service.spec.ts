import { Test, TestingModule } from '@nestjs/testing';
import { LeaseExpirySchedulerService } from '../services/lease-expiry-scheduler.service';
import { PrismaService } from '../../../database/prisma.service';
import { LeaseStatusService } from '../lease-status.service';
import { LeaseStatus, LeaseRenewalType } from '@prisma/client';
import { BadRequestException, Logger } from '@nestjs/common';

describe('LeaseExpirySchedulerService', () => {
  let service: LeaseExpirySchedulerService;
  let prisma: PrismaService;
  let leaseStatusService: LeaseStatusService;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaseExpirySchedulerService,
        {
          provide: PrismaService,
          useValue: {
            lease: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: LeaseStatusService,
          useValue: {
            expireLease: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LeaseExpirySchedulerService>(LeaseExpirySchedulerService);
    prisma = module.get<PrismaService>(PrismaService);
    leaseStatusService = module.get<LeaseStatusService>(LeaseStatusService);

    // Mock logger to prevent console spam during tests and assert calls
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('expireOverdueLeases', () => {
    const pastDate = new Date(new Date().getTime() - 100000);

    it('processes and expires a valid ACTIVE lease', async () => {
      jest.spyOn(prisma.lease, 'findMany').mockResolvedValue([
        { id: 'lease-active', status: LeaseStatus.ACTIVE, endDate: pastDate, renewalType: LeaseRenewalType.FIXED_END }
      ] as any);

      jest.spyOn(leaseStatusService, 'expireLease').mockResolvedValue({} as any);

      const result = await service.expireOverdueLeases();

      expect(leaseStatusService.expireLease).toHaveBeenCalledWith('lease-active');
      expect(result.processed).toBe(1);
      expect(result.expired).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('processes and expires a valid PENDING_TERMINATION_APPROVAL lease', async () => {
      jest.spyOn(prisma.lease, 'findMany').mockResolvedValue([
        { id: 'lease-pending', status: LeaseStatus.PENDING_TERMINATION_APPROVAL, endDate: pastDate, renewalType: LeaseRenewalType.FIXED_END }
      ] as any);

      jest.spyOn(leaseStatusService, 'expireLease').mockResolvedValue({} as any);

      const result = await service.expireOverdueLeases();

      expect(leaseStatusService.expireLease).toHaveBeenCalledWith('lease-pending');
      expect(result.processed).toBe(1);
      expect(result.expired).toBe(1);
    });

    it('skips and logs a warning for AUTO_MONTH_TO_MONTH leases', async () => {
      jest.spyOn(prisma.lease, 'findMany').mockResolvedValue([
        { id: 'lease-auto', status: LeaseStatus.ACTIVE, endDate: pastDate, renewalType: LeaseRenewalType.AUTO_MONTH_TO_MONTH }
      ] as any);

      const result = await service.expireOverdueLeases();

      expect(leaseStatusService.expireLease).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping lease lease-auto — AUTO_MONTH_TO_MONTH'));
      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.expired).toBe(0);
    });

    it('handles idempotent expiration cleanly (already EXPIRED)', async () => {
      jest.spyOn(prisma.lease, 'findMany').mockResolvedValue([
        { id: 'lease-expired', status: LeaseStatus.ACTIVE, endDate: pastDate, renewalType: LeaseRenewalType.FIXED_END }
      ] as any);

      jest.spyOn(leaseStatusService, 'expireLease').mockRejectedValue(
        new BadRequestException('Cannot expire lease in status EXPIRED. Expected ACTIVE or PENDING_TERMINATION_APPROVAL.')
      );

      const result = await service.expireOverdueLeases();

      expect(leaseStatusService.expireLease).toHaveBeenCalledWith('lease-expired');
      expect(errorSpy).not.toHaveBeenCalled(); // No actual error logged
      expect(result.skipped).toBe(1);
      expect(result.expired).toBe(0);
    });

    it('catches and logs random unexpected errors without crashing', async () => {
      jest.spyOn(prisma.lease, 'findMany').mockResolvedValue([
        { id: 'lease-error', status: LeaseStatus.ACTIVE, endDate: pastDate, renewalType: LeaseRenewalType.FIXED_END }
      ] as any);

      jest.spyOn(leaseStatusService, 'expireLease').mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.expireOverdueLeases();

      expect(leaseStatusService.expireLease).toHaveBeenCalledWith('lease-error');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to expire lease lease-error'),
        expect.any(String)
      );
      expect(result.expired).toBe(0);
      expect(result.skipped).toBe(0); // Not counted as intentionally skipped
    });

    it('batch processes multiple leases correctly regardless of individual failures', async () => {
      jest.spyOn(prisma.lease, 'findMany').mockResolvedValue([
        { id: 'lease-active', status: LeaseStatus.ACTIVE, endDate: pastDate, renewalType: LeaseRenewalType.FIXED_END },
        { id: 'lease-auto', status: LeaseStatus.ACTIVE, endDate: pastDate, renewalType: LeaseRenewalType.AUTO_MONTH_TO_MONTH },
        { id: 'lease-error', status: LeaseStatus.ACTIVE, endDate: pastDate, renewalType: LeaseRenewalType.FIXED_END }
      ] as any);

      jest.spyOn(leaseStatusService, 'expireLease').mockImplementation(async (id: string) => {
        if (id === 'lease-error') throw new Error('Boom');
        return {} as any;
      });

      const result = await service.expireOverdueLeases();

      expect(leaseStatusService.expireLease).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(3);
      expect(result.expired).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });
});
