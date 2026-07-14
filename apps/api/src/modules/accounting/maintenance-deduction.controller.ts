import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { MaintenanceDeductionService } from './maintenance-deduction.service';
import { CreateMaintenanceDeductionDto } from './dto/create-maintenance-deduction.dto';
import { MaintenanceDeductionResponseDto } from './dto/maintenance-deduction-response.dto';

@ApiTags('Accounting - Maintenance Deductions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounting/maintenance-deductions')
export class MaintenanceDeductionController {
  constructor(
    private readonly maintenanceDeductionService: MaintenanceDeductionService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN) // PMC-staff only. Unrestricted property access is inherent.
  @ApiOperation({ summary: 'Create a maintenance deduction from a work order' })
  async create(
    @Body() dto: CreateMaintenanceDeductionDto,
    @CurrentUser() user: User,
  ): Promise<MaintenanceDeductionResponseDto> {
    
    // 1. Call MaintenanceDeductionService.createDeduction(dto.workOrderId, user.id)
    const deduction = await this.maintenanceDeductionService.createDeduction(
      dto.workOrderId,
      user.id,
    );

    // 2. Map returned entity to MaintenanceDeductionResponseDto
    const response = new MaintenanceDeductionResponseDto();
    response.id = deduction.id;
    response.leaseId = deduction.leaseId;
    response.amount = deduction.amount.toNumber();
    response.deductionMonth = deduction.deductionMonth;

    // 3. Return DTO
    return response;
  }
}
