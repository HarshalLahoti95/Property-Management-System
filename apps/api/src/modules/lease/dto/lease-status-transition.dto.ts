import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeaseStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaseStatusTransitionDto {
  @ApiProperty({ enum: LeaseStatus, description: 'The new status to transition to' })
  @IsEnum(LeaseStatus)
  @IsNotEmpty()
  status!: LeaseStatus;

  @ApiPropertyOptional({ example: 'Lease signed by both parties.', description: 'Reason or context for the status update' })
  @IsString()
  @IsOptional()
  reasonDescription?: string;
}
