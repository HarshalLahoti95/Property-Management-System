import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LedgerService } from '../accounting/ledger.service';
import { RecordDepositReturnDto } from './dto/record-deposit-return.dto';
import { LedgerType, LedgerTriggerEvent, LeaseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DepositReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  async recordDepositReturn(
    dto: RecordDepositReturnDto,
    user: { id: string; role: string },
  ) {
    // Defense-in-depth: Ensure only ADMIN can record deposit returns
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can record security deposit returns.');
    }

    // 1. Find lease & verify status EXPIRED | TERMINATED
    const lease = await this.prisma.lease.findUnique({
      where: { id: dto.leaseId },
      include: { financialLedgers: true },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.status !== LeaseStatus.EXPIRED && lease.status !== LeaseStatus.TERMINATED) {
      throw new BadRequestException('Security deposits can only be returned for EXPIRED or TERMINATED leases.');
    }

    // 2. Load TRUST ledger
    const trustLedger = lease.financialLedgers.find((l) => l.ledgerType === LedgerType.TRUST);
    if (!trustLedger) {
      throw new InternalServerErrorException('TRUST ledger not found for lease.');
    }

    const returnAmount = new Decimal(dto.amount);

    // 3. Defense-in-depth: Validate amount <= runningBalance
    if (returnAmount.gt(trustLedger.runningBalance)) {
      throw new BadRequestException('Return amount cannot exceed the TRUST ledger running balance.');
    }

    // 4. Wrap in transaction
    return this.prisma.$transaction(async (tx) => {
      // Create SecurityDepositReturn row
      const depositReturn = await tx.securityDepositReturn.create({
        data: {
          leaseId: lease.id,
          amount: returnAmount,
          recordedByUserId: user.id,
          reference: dto.reference,
          reason: dto.reason,
        },
      });

      // Update TRUST ledger balance with negative delta
      const updatedLedger = await this.ledgerService.updateBalance(
        {
          ledgerId: trustLedger.id,
          amountDelta: returnAmount.negated(),
          triggerEventType: LedgerTriggerEvent.DEPOSIT_RETURN,
          triggerEventId: depositReturn.id,
        },
        tx
      );

      return {
        id: depositReturn.id,
        leaseId: depositReturn.leaseId,
        amount: depositReturn.amount,
        trustBalance: updatedLedger.ledger.runningBalance,
      };
    });
  }
}
