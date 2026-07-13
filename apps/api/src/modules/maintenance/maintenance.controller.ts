import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { AssignVendorDto } from './dto/assign-vendor.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @ApiOperation({ summary: 'Submit a new maintenance work order request' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Post('work-orders')
  async create(@Body() dto: CreateWorkOrderDto, @CurrentUser() user: any) {
    return this.maintenanceService.create(dto, user);
  }

  @ApiOperation({ summary: 'List and filter maintenance work orders' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('work-orders')
  async findAll(@Query() query: WorkOrderQueryDto, @CurrentUser() user: any) {
    return this.maintenanceService.findAll(query, user);
  }

  @ApiOperation({ summary: 'Get details of a single work order' })
  @ApiParam({ name: 'id', description: 'Work Order UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('work-orders/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Update parameter parameters (costs, description) of an open work order' })
  @ApiParam({ name: 'id', description: 'Work Order UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Patch('work-orders/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Transition lifecycle status of a work order' })
  @ApiParam({ name: 'id', description: 'Work Order UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Post('work-orders/:id/status')
  async transition(
    @Param('id') id: string,
    @Body() dto: TransitionStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.transition(id, dto, user);
  }

  @ApiOperation({ summary: 'Assign or reassign a vendor to a work order' })
  @ApiParam({ name: 'id', description: 'Work Order UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Post('work-orders/:id/assign-vendor')
  async assignVendor(
    @Param('id') id: string,
    @Body() dto: AssignVendorDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.assignVendor(id, dto, user);
  }

  @ApiOperation({ summary: 'Post an immutable comment on a work order request' })
  @ApiParam({ name: 'id', description: 'Work Order UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Post('work-orders/:id/comments')
  async createComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.createComment(id, dto, user);
  }

  @ApiOperation({ summary: 'Retrieve status and assignment history audit trail for a work order' })
  @ApiParam({ name: 'id', description: 'Work Order UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('work-orders/:id/history')
  async findHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.findHistory(id, user);
  }

  @ApiOperation({ summary: 'Soft-delete a work order' })
  @ApiParam({ name: 'id', description: 'Work Order UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD)
  @Delete('work-orders/:id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.remove(id, user);
  }
}
