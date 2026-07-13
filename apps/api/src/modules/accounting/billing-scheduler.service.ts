import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaseStatus, LedgerType, ChargeType, ChargeStatus, LedgerTriggerEvent } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { LedgerService } from './ledger.service';
import { ChargeService } from './charge.service';

@Injectable()
export class BillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly chargeService: ChargeService
  ) {}

  onModuleInit() {
    this.logger.log('BillingScheduler Service Initialized');
    // In a production setup, this would be registered with a scheduler framework like @nestjs/schedule.
    // For local development, we expose these methods to be triggered via jobs/endpoints.
  }

  /**
   * Scans for ACTIVE leases that do not have ledgers created yet,
   * and initializes their Operating and Trust ledgers.
   */
  async syncActivatedLeases(): Promise<{ initialized: number }> {
    this.logger.log('Running LeaseActivationSync...');
    
    // Find active leases that don't have an Operating ledger
    const activeLeases = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        deletedAt: null,
        financialLedgers: {
          none: {
            ledgerType: LedgerType.OPERATING,
          },
        },
      },
    });

    this.logger.log(`Found ${activeLeases.length} active leases requiring ledger initialization.`);
    let initialized = 0;

    for (const lease of activeLeases) {
      try {
        await this.ledgerService.createLedgersForLease(lease.id);
        initialized++;
      } catch (err) {
        this.logger.error(`Failed to initialize ledgers for lease ${lease.id}: ${(err as Error).message}`, (err as Error).stack);
      }
    }

    return { initialized };
  }

  /**
   * Generates recurring RENT charges for active leases for a target billing month.
   */
  async generateMonthlyRent(billingMonth: Date): Promise<{ generated: number }> {
    this.logger.log(`Running MonthlyRentGeneration for month starting ${billingMonth.toISOString()}...`);

    const activeLeases = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        financialLedgers: {
          where: { ledgerType: LedgerType.OPERATING },
        },
      },
    });

    let generated = 0;

    for (const lease of activeLeases) {
      const opLedger = lease.financialLedgers[0];
      if (!opLedger) {
        this.logger.warn(`Active lease ${lease.id} does not have an Operating Ledger. Skipping rent generation.`);
        continue;
      }

      // Calculate the specific due date for this lease in the target month
      const dueDate = new Date(billingMonth.getFullYear(), billingMonth.getMonth(), lease.rentDueDay);

      // Validate that the due date falls within the lease duration
      if (dueDate < lease.startDate || dueDate > lease.endDate) {
        continue;
      }

      try {
        await this.chargeService.generateMonthlyCharges(lease.id, billingMonth);
        generated++;
      } catch (err) {
        this.logger.error(`Failed to generate rent for lease ${lease.id}: ${(err as Error).message}`);
      }
    }

    return { generated };
  }
}
