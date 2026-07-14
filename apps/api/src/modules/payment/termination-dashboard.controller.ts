import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TerminationDashboardService } from './termination-dashboard.service';
import { GetTerminationDashboardQueryDto } from './dto/get-termination-dashboard-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Accounting Terminations') // Grouped with accounting in swagger docs
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/accounting/terminations') // Maintaining requested URL
export class TerminationDashboardController {
  constructor(private readonly dashboardService: TerminationDashboardService) {}

  @ApiOperation({ summary: 'Get Terminations Dashboard (Admin Only)' })
  @Roles(UserRole.ADMIN)
  @Get('dashboard')
  async getTerminationDashboard(@Query() query: GetTerminationDashboardQueryDto) {
    return this.dashboardService.getTerminationDashboard(query);
  }
}
