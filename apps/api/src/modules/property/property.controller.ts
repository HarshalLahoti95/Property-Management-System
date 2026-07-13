import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.LANDLORD)
@Controller('v1/properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @ApiOperation({ summary: 'Register a new physical property' })
  @Post()
  async create(@Body() dto: CreatePropertyDto, @CurrentUser() user: any) {
    return this.propertyService.create(dto, user);
  }

  @ApiOperation({ summary: 'Retrieve paginated lists of registered properties' })
  @Get()
  async findAll(@Query() query: PropertyQueryDto, @CurrentUser() user: any) {
    return this.propertyService.findAll(query, user);
  }

  @ApiOperation({ summary: 'Retrieve properties grouped by landlord' })
  @Roles(UserRole.ADMIN)
  @Get('by-landlord')
  async getByLandlord(@CurrentUser() user: any) {
    return this.propertyService.findAllGroupedByLandlord(user);
  }

  @ApiOperation({ summary: 'Retrieve details of a single property' })
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertyService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Update parameters of a single property' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePropertyDto, @CurrentUser() user: any) {
    return this.propertyService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Request to soft-delete a property records' })
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertyService.remove(id, user);
  }

  @ApiOperation({ summary: 'Approve property deletion request' })
  @Post(':id/approve-deletion')
  async approveDeletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertyService.approveDeletion(id, user);
  }

  @ApiOperation({ summary: 'Reject property deletion request' })
  @Post(':id/reject-deletion')
  async rejectDeletion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertyService.rejectDeletion(id, user);
  }

  @ApiOperation({ summary: 'Get occupancy and maintenance work orders dashboard stats' })
  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string, @CurrentUser() user: any) {
    return this.propertyService.getDashboard(id, user);
  }
}
