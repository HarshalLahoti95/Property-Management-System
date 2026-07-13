import { Controller, Get, Res, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @ApiOperation({ summary: 'Retrieve consolidated overview dashboard statistics' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Get('dashboard/summary')
  async getSummary(@CurrentUser() user: any) {
    return this.reportingService.getSummary(user);
  }

  @ApiOperation({ summary: 'Retrieve detailed occupancy rates and lease expirations' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Get('occupancy')
  async getOccupancy(@CurrentUser() user: any) {
    return this.reportingService.getOccupancy(user);
  }

  @ApiOperation({ summary: 'Retrieve revenue aggregates and historical payment trends' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Get('financials')
  async getFinancials(@CurrentUser() user: any) {
    return this.reportingService.getFinancials(user);
  }

  @ApiOperation({ summary: 'Retrieve maintenance statistics and cost aggregates' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Get('maintenance')
  async getMaintenance(@CurrentUser() user: any) {
    return this.reportingService.getMaintenance(user);
  }

  @ApiOperation({ summary: 'Download CSV export report of leases list' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Get('export/leases')
  async exportLeases(@Res() res: any, @CurrentUser() user: any) {
    const csvContent = await this.reportingService.exportLeases(user);
    const timestamp = Date.now();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leases-report-${timestamp}.csv`);
    res.status(200).send(csvContent);
  }

  @ApiOperation({ summary: 'Download CSV export report of financial receipts list' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Get('export/financials')
  async exportFinancials(@Res() res: any, @CurrentUser() user: any) {
    const csvContent = await this.reportingService.exportFinancials(user);
    const timestamp = Date.now();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=financials-report-${timestamp}.csv`);
    res.status(200).send(csvContent);
  }
}
