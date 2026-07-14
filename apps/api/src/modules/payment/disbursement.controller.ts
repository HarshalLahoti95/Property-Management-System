import { Controller, Get, Post, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DisbursementService } from './disbursement.service';
import { PaymentRepository } from './payment.repository';
import { LedgerService } from '../accounting/ledger.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, LedgerType } from '@prisma/client';
import type { User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { 
  CreateManualDisbursementDto, 
  DisbursementCreatedResponseDto, 
  LeaseDisbursementSummaryDto 
} from './dto/disbursement.dto';

@ApiTags('Disbursements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disbursements')
export class DisbursementController {
  constructor(
    private readonly disbursementService: DisbursementService,
    private readonly paymentRepository: PaymentRepository,
    private readonly ledgerService: LedgerService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a manual disbursement for a lease (PMC Staff Only)' })
  async createManualDisbursement(
    @Body() dto: CreateManualDisbursementDto,
    @CurrentUser() user: User,
  ): Promise<DisbursementCreatedResponseDto> {
    // 1. Verify access to the lease (ADMIN inherently passes but this is good practice/pattern)
    await this.paymentRepository.validateLeaseAccess(dto.leaseId, user);

    // 2. The amount is already validated by @Min(0.01) in the DTO, guaranteeing > 0
    const decimalAmount = new Decimal(dto.amount);

    // 3. Perform the disbursement
    const disbursement = await this.disbursementService.createManualDisbursement(
      dto.leaseId,
      decimalAmount,
      dto.referenceNote ?? null,
      user.id,
    );

    // 4. Fetch updated information for the response
    const newAmountOwed = await this.disbursementService.computeLandlordAmountOwed(dto.leaseId);
    const trustLedger = await this.ledgerService.getLedger(dto.leaseId, LedgerType.TRUST);

    return {
      disbursementId: disbursement.id,
      status: disbursement.status,
      amount: disbursement.amount.toString(),
      newAmountOwed: newAmountOwed.toString(),
      updatedTrustLedgerBalance: trustLedger.runningBalance.toString(),
    };
  }

  @Get('lease/:leaseId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get lease disbursement summary and history (PMC Staff Only)' })
  async getLeaseDisbursementSummary(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ): Promise<LeaseDisbursementSummaryDto> {
    // 1. Verify access
    await this.paymentRepository.validateLeaseAccess(leaseId, user);

    // 2. Fetch current owed and trust balance
    const currentAmountOwed = await this.disbursementService.computeLandlordAmountOwed(leaseId);
    const trustLedger = await this.ledgerService.getLedger(leaseId, LedgerType.TRUST);

    // 3. Fetch history
    const history = await this.prisma.disbursement.findMany({
      where: { leaseId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      leaseId,
      currentAmountOwed: currentAmountOwed.toString(),
      trustLedgerBalance: trustLedger.runningBalance.toString(),
      disbursements: history.map(d => ({
        id: d.id,
        amount: d.amount.toString(),
        status: d.status,
        method: d.method,
        reference: d.reference,
        recordedByUserId: d.recordedByUserId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    };
  }
}
