import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus } from '@prisma/client';

export class TransitionStatusDto {
  @ApiProperty({ enum: WorkOrderStatus, example: WorkOrderStatus.IN_PROGRESS, description: 'The new status to transition the work order to' })
  @IsEnum(WorkOrderStatus)
  @IsNotEmpty()
  status!: WorkOrderStatus;

  @ApiPropertyOptional({ example: 'Starting the repair on-site', description: 'Audit comment or reason for the status transition' })
  @IsString()
  @IsOptional()
  reasonDescription?: string;
}
