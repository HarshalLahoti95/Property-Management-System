import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaseStatus, LedgerType, ChargeType, ChargeStatus, LedgerTriggerEvent } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        await this.prisma.$transaction(async (tx) => {
          // Double-check inside transaction to prevent race conditions
          const existingLedger = await tx.financialLedger.findFirst({
            where: { leaseId: lease.id },
          });
          if (existingLedger) return;

          // 1. Create Operating Ledger
          const operatingLedger = await tx.financialLedger.create({
            data: {
              leaseId: lease.id,
              ledgerType: LedgerType.OPERATING,
              runningBalance: new Prisma.Decimal(0.00),
            },
          });

          await tx.ledgerBalanceHistory.create({
            data: {
              ledgerId: operatingLedger.id,
              oldBalance: new Prisma.Decimal(0.00),
              newBalance: new Prisma.Decimal(0.00),
              triggerEventType: LedgerTriggerEvent.CHARGE,
              triggerEventId: lease.id, // Linked to the activation event
            },
          });

          // 2. Create Trust Ledger
          const trustLedger = await tx.financialLedger.create({
            data: {
              leaseId: lease.id,
              ledgerType: LedgerType.TRUST,
              runningBalance: new Prisma.Decimal(0.00),
            },
          });

          await tx.ledgerBalanceHistory.create({
            data: {
              ledgerId: trustLedger.id,
              oldBalance: new Prisma.Decimal(0.00),
              newBalance: new Prisma.Decimal(0.00),
              triggerEventType: LedgerTriggerEvent.CHARGE,
              triggerEventId: lease.id,
            },
          });

          // 3. Post Security Deposit Charge to the Trust Ledger if deposit > 0
          if (lease.securityDeposit && new Prisma.Decimal(lease.securityDeposit).gt(0)) {
            const depositAmount = new Prisma.Decimal(lease.securityDeposit);
            
            const depositCharge = await tx.rentCharge.create({
              data: {
                ledgerId: trustLedger.id,
                dueDate: lease.startDate,
                type: ChargeType.SECURITY_DEPOSIT,
                amount: depositAmount,
                paidAmount: new Prisma.Decimal(0.00),
                status: ChargeStatus.UNPAID,
                description: 'Initial Security Deposit Requirement',
              },
            });

            // Update Trust Ledger running balance atomically
            await tx.financialLedger.update({
              where: { id: trustLedger.id },
              data: {
                runningBalance: {
                  increment: depositAmount,
                },
              },
            });

            // Update history
            await tx.ledgerBalanceHistory.create({
              data: {
                ledgerId: trustLedger.id,
                oldBalance: new Prisma.Decimal(0.00),
                newBalance: depositAmount,
                triggerEventType: LedgerTriggerEvent.CHARGE,
                triggerEventId: depositCharge.id,
              },
            });
          }
        });

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
        await this.prisma.$transaction(async (tx) => {
          // Check if a RENT charge already exists for this ledger and due date
          const existingRentCharge = await tx.rentCharge.findFirst({
            where: {
              ledgerId: opLedger.id,
              type: ChargeType.RENT,
              dueDate: dueDate,
            },
          });

          if (existingRentCharge) {
            return; // Already generated
          }

          const rentAmount = new Prisma.Decimal(lease.monthlyRent);

          // Create Rent Charge
          const rentCharge = await tx.rentCharge.create({
            data: {
              ledgerId: opLedger.id,
              dueDate: dueDate,
              type: ChargeType.RENT,
              amount: rentAmount,
              paidAmount: new Prisma.Decimal(0.00),
              status: ChargeStatus.UNPAID,
              description: `Monthly Rent Charge - ${billingMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            },
          });

          // Fetch current balance of ledger
          const ledgerBefore = await tx.financialLedger.findUniqueOrThrow({
            where: { id: opLedger.id },
          });

          const oldBalance = ledgerBefore.runningBalance;
          const newBalance = oldBalance.plus(rentAmount);

          // Update running balance atomically
          await tx.financialLedger.update({
            where: { id: opLedger.id },
            data: {
              runningBalance: newBalance,
            },
          });

          // Log History
          await tx.ledgerBalanceHistory.create({
            data: {
              ledgerId: opLedger.id,
              oldBalance,
              newBalance,
              triggerEventType: LedgerTriggerEvent.CHARGE,
              triggerEventId: rentCharge.id,
            },
          });

          generated++;
        });
      } catch (err) {
        this.logger.error(`Failed to generate rent for lease ${lease.id}: ${(err as Error).message}`);
      }
    }

    return { generated };
  }
}
