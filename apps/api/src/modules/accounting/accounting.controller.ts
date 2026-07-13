import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { AdjustChargeDto } from './dto/adjust-charge.dto';
import { ChargeQueryDto } from './dto/charge-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @ApiOperation({ summary: 'Retrieve Operating and Trust ledgers for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('ledgers/lease/:leaseId')
  async findLedgersByLeaseId(@Param('leaseId') leaseId: string, @CurrentUser() user: any) {
    return this.accountingService.findLedgersByLeaseId(leaseId, user);
  }

  @ApiOperation({ summary: 'Retrieve dashboard summary (balances, next due charge, etc.) for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('leases/:leaseId/summary')
  async getLeaseSummary(@Param('leaseId') leaseId: string, @CurrentUser() user: any) {
    return this.accountingService.getLeaseSummary(leaseId, user);
  }

  @ApiOperation({ summary: 'Retrieve audit trail balance history for a ledger' })
  @ApiParam({ name: 'ledgerId', description: 'Ledger UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('ledgers/:ledgerId/history')
  async findLedgerHistory(
    @Param('ledgerId') ledgerId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @CurrentUser() user: any,
  ) {
    return this.accountingService.findLedgerHistory(
      ledgerId,
      { page: parseInt(page, 10), limit: parseInt(limit, 10) },
      user,
    );
  }

  @ApiOperation({ summary: 'Create a one-time manual ledger charge (Utility, Late Fee, etc.)' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Post('charges')
  async createCharge(@Body() dto: CreateChargeDto, @CurrentUser() user: any) {
    return this.accountingService.createCharge(dto, user);
  }

  @ApiOperation({ summary: 'List and filter ledger charges' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('charges')
  async findAllCharges(@Query() query: ChargeQueryDto, @CurrentUser() user: any) {
    return this.accountingService.findAllCharges(query, user);
  }

  @ApiOperation({ summary: 'Void an unpaid manual charge' })
  @ApiParam({ name: 'id', description: 'Charge UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Post('charges/:id/void')
  async voidCharge(@Param('id') id: string, @CurrentUser() user: any) {
    return this.accountingService.voidCharge(id, user);
  }

  @ApiOperation({ summary: 'Apply a credit adjustment to a cleared or partially cleared charge' })
  @ApiParam({ name: 'id', description: 'Charge UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Post('charges/:id/adjust')
  async adjustCharge(
    @Param('id') id: string,
    @Body() dto: AdjustChargeDto,
    @CurrentUser() user: any,
  ) {
    return this.accountingService.adjustCharge(id, dto, user);
  }
}
