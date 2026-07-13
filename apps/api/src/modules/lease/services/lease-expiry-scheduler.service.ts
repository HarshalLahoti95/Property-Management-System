import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { LeaseStatus, LeaseRenewalType } from '@prisma/client';
import { LeaseStatusService } from '../lease-status.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LeaseExpirySchedulerService {
  private readonly logger = new Logger(LeaseExpirySchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseStatusService: LeaseStatusService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireOverdueLeases(): Promise<{ processed: number, expired: number, skipped: number }> {
    const now = new Date();
    this.logger.log(`Running LeaseExpiryCheck at ${now.toISOString()}...`);

    const overdueLeases = await this.prisma.lease.findMany({
      where: {
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING_TERMINATION_APPROVAL] },
        endDate: { lte: now },
        deletedAt: null,
      },
    });

    this.logger.log(`Found ${overdueLeases.length} active/pending-termination leases past their end date.`);
    let processed = overdueLeases.length;
    let expired = 0;
    let skipped = 0;

    for (const lease of overdueLeases) {
      if (lease.renewalType === LeaseRenewalType.AUTO_MONTH_TO_MONTH) {
        this.logger.warn(`Skipping lease ${lease.id} — AUTO_MONTH_TO_MONTH renewal is pending business rules.`);
        skipped++;
        continue;
      }

      try {
        await this.leaseStatusService.expireLease(lease.id);
        expired++;
        this.logger.log(`Expired lease ${lease.id} (unit: ${lease.unitId})`);
      } catch (err) {
        if (err instanceof BadRequestException && err.message.includes('Expected ACTIVE or PENDING_TERMINATION_APPROVAL')) {
          // Idempotency: it was already expired or transitioned in the meantime
          this.logger.debug(`Lease ${lease.id} is no longer in an expirable status, skipping.`);
          skipped++;
        } else {
          this.logger.error(
            `Failed to expire lease ${lease.id}: ${(err as Error).message}`,
            (err as Error).stack,
          );
        }
      }
    }

    this.logger.log(`LeaseExpiryCheck complete. Expired ${expired} lease(s). Skipped ${skipped}.`);
    return { processed, expired, skipped };
  }
}
