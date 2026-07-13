import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeaseService } from './lease.service';
import { LeaseStatusService } from './lease-status.service';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { LeaseStatusTransitionDto } from './dto/lease-status-transition.dto';
import { LeaseQueryDto } from './dto/lease-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import * as fs from 'fs';
import * as path from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Leases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
@Controller('v1/leases')
export class LeaseController {
  constructor(
    private readonly leaseService: LeaseService,
    private readonly leaseStatusService: LeaseStatusService,
  ) {}

  @Get('field-schema')
  @ApiOperation({ summary: 'Get lease field schema' })
  @ApiResponse({ status: 200, description: 'Returns the form field schema for lease generation.' })
  getFieldSchema() {
    const schemaPath = path.join(__dirname, 'assets', 'lease-field-schema.json');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('lease-field-schema.json not found');
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schema);
  }

  @ApiOperation({ summary: 'Draft a new lease contract' })
  @Post()
  async create(@Body() dto: CreateLeaseDto, @CurrentUser() user: any) {
    return this.leaseService.create(dto, user);
  }

  @ApiOperation({ summary: 'Retrieve paginated and filtered list of leases' })
  @Get()
  async findAll(@Query() query: LeaseQueryDto, @CurrentUser() user: any) {
    return this.leaseService.findAll(query, user);
  }

  @ApiOperation({ summary: 'Get details of a single lease' })
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leaseService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Get documents for a lease' })
  @Get(':id/documents')
  async getDocuments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leaseService.getDocuments(id, user);
  }

  @ApiOperation({ summary: 'Update parameters of a draft lease' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeaseDto,
    @CurrentUser() user: any,
  ) {
    return this.leaseService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Transition the lifecycle status of a lease' })
  @Post(':id/status')
  async transition(
    @Param('id') id: string,
    @Body() dto: LeaseStatusTransitionDto,
    @CurrentUser() user: any,
  ) {
    return this.leaseStatusService.transitionDispatcher(id, dto, user);
  }

  @ApiOperation({ summary: 'Soft-delete a lease contract' })
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leaseStatusService.cancelLease(id, user);
  }
}
