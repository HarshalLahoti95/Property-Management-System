import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: true, description: 'Enable or disable email notifications globally' })
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Enable or disable SMS notifications globally' })
  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Enable or disable push notifications globally' })
  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Opt-in or opt-out of marketing and other non-critical notifications' })
  @IsBoolean()
  @IsOptional()
  marketingEmailsEnabled?: boolean;
}
