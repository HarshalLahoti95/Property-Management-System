import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UnitService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitQueryDto } from './dto/unit-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LANDLORD)
@Controller()
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @ApiOperation({ summary: 'Add a new unit under a specific property' })
  @Post('v1/properties/:propertyId/units')
  async create(
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateUnitDto,
    @CurrentUser() user: any,
  ) {
    return this.unitService.create(propertyId, dto, user);
  }

  @ApiOperation({ summary: 'Get paginated list of units under a specific property' })
  @Get('v1/properties/:propertyId/units')
  async findAll(
    @Param('propertyId') propertyId: string,
    @Query() query: UnitQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.unitService.findAll(propertyId, query, user);
  }

  @ApiOperation({ summary: 'Get details of a specific unit' })
  @Get('v1/units/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Update details of a specific unit' })
  @Patch('v1/units/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: any,
  ) {
    return this.unitService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Request soft-delete a unit' })
  @Delete('v1/units/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitService.remove(id, user);
  }

  @ApiOperation({ summary: 'Approve unit deletion request' })
  @Post('v1/units/:id/approve-deletion')
  async approveDeletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitService.approveDeletion(id, user);
  }

  @ApiOperation({ summary: 'Reject unit deletion request' })
  @Post('v1/units/:id/reject-deletion')
  async rejectDeletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitService.rejectDeletion(id, user);
  }
}
