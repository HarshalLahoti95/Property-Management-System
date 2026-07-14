import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './payment.repository';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, Prisma } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentRepository: PaymentRepository
  ) {}

  @ApiOperation({ summary: 'PMC Manual Payment Record' })
  @Roles(UserRole.ADMIN)
  @Post('record')
  async recordPaymentReceived(
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    // 1. Lease access check (admin/PMC operating on a valid, undeleted lease)
    await this.paymentRepository.validateLeaseAccess(dto.leaseId, user);

    // 2. Execute the payment logic
    const payment = await this.paymentService.recordPaymentReceived(
      dto.leaseId,
      dto.tenantId,
      new Prisma.Decimal(dto.amount),
      dto.method,
      dto.reference || null,
      user.id,
    );

    // 3. Fetch detailed context (allocations, ledger) for the transparency response
    const allocations = await this.paymentRepository.findAllocationsByPaymentId(payment.id);
    const ledger = await this.paymentRepository.findLedgerById(payment.ledgerId); 

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
      transactionReference: payment.transactionReference,
      allocations: allocations.map(a => ({
        rentChargeId: a.rentChargeId,
        landlordShareAmount: a.landlordShareAmount.toString(),
        companyShareAmount: a.companyShareAmount.toString(),
        allocatedAt: a.allocatedAt,
      })),
      ledger: {
        id: ledger.id,
        runningBalance: ledger.runningBalance.toString(),
      },
    };
  }

  @ApiOperation({ summary: 'Get itemized due balance for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease UUID' })
  @Roles(UserRole.TENANT, UserRole.ADMIN)
  @Get('lease/:leaseId/due-balance')
  async getDueBalance(
    @Param('leaseId') leaseId: string,
    @CurrentUser() user: any,
  ) {
    // 1. Reuse standard lease access pattern (Throws ForbiddenException if tenant isn't on lease)
    await this.paymentRepository.validateLeaseAccess(leaseId, user);

    // 2. Fetch data
    const data = await this.paymentService.getDueBalance(leaseId);

    if (!data.billingMonth) {
       return { totalRemainingBalance: '0.00', charges: [] };
    }

    // 3. Exact field mapping to strictly strip out ledgers, splits, and company shares
    return {
      billingMonth: data.billingMonth,
      totalRemainingBalance: data.totalRemainingBalance,
      charges: data.charges.map((charge: any) => ({
        id: charge.id,
        type: charge.type,
        description: charge.description,
        amount: charge.amount.toString(),
        paidAmount: charge.paidAmount.toString(),
        balance: (new Prisma.Decimal(charge.amount).minus(new Prisma.Decimal(charge.paidAmount))).toString(),
        dueDate: charge.dueDate,
      })),
    };
  }

  @ApiOperation({ summary: 'Submit/register a tenant payment' })
  @Roles(UserRole.ADMIN, UserRole.TENANT)
  @Post()
  async create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentService.create(dto, user);
  }

  @ApiOperation({ summary: 'Retrieve details of a payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentService.findOne(id, user);
  }

  @ApiOperation({ summary: 'List and filter payments' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get()
  async findAll(@Query() query: PaymentQueryDto, @CurrentUser() user: any) {
    return this.paymentService.findAll(query, user);
  }

  @ApiOperation({ summary: 'Retrieve allocation history mapping for a payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get(':id/allocations')
  async findHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.paymentService.findHistory(id, user);
  }

  @ApiOperation({ summary: 'Initiate a full or partial refund on a payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Post(':id/refund')
  async refund(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.refund(id, dto, user);
  }

  @ApiOperation({ summary: 'Approve a pending cash payment' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  @Roles(UserRole.LANDLORD)
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.approve(id, user);
  }
}
