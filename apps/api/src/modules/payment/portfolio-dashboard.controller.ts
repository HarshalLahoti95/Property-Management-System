import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PortfolioDashboardService } from './portfolio-dashboard.service';
import { PortfolioDashboardQueryDto, PortfolioDashboardResponseDto } from './dto/portfolio-dashboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Accounting Portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/accounting/portfolio')
export class PortfolioDashboardController {
  constructor(private readonly portfolioDashboardService: PortfolioDashboardService) {}

  @ApiOperation({ summary: 'Retrieve portfolio-wide financial dashboard' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Get('dashboard')
  async getPortfolioDashboard(
    @Query() query: PortfolioDashboardQueryDto,
    @CurrentUser() user: any
  ): Promise<PortfolioDashboardResponseDto> {
    // Controller enforces the landlord lock
    const enforcedLandlordId = user.role === UserRole.LANDLORD ? user.id : query.landlordId;
    
    return this.portfolioDashboardService.getPortfolioDashboard({
      ...query,
      landlordId: enforcedLandlordId,
      isLandlord: user.role === UserRole.LANDLORD
    });
  }
}
