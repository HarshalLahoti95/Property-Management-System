import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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
