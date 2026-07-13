import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'List and filter notification logs (Scoped to user)' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get()
  async findAll(@Query() query: NotificationQueryDto, @CurrentUser() user: any) {
    return this.notificationService.findAll(query, user);
  }

  @ApiOperation({ summary: 'Retrieve preference configurations for current user' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    return this.notificationService.getPreferences(user.id);
  }

  @ApiOperation({ summary: 'Retrieve specific notification logs' })
  @ApiParam({ name: 'id', description: 'Notification History UUID' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Update preference options (marketing, opt-out)' })
  @Roles(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT)
  @Patch('preferences')
  async updatePreferences(@Body() dto: UpdatePreferencesDto, @CurrentUser() user: any) {
    return this.notificationService.updatePreferences(user.id, dto);
  }

  @ApiOperation({ summary: 'Send direct SMTP test notification (Admin only)' })
  @Roles(UserRole.ADMIN)
  @Post('test')
  async sendTestNotification(
    @Body('email') recipientEmail: string,
    @CurrentUser() user: any,
  ) {
    return this.notificationService.sendTestNotification(user.id, recipientEmail);
  }
}
