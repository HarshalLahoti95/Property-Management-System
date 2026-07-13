import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority, WorkOrderStatus } from '@prisma/client';

export class WorkOrderQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page limit' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit = 10;

  @ApiPropertyOptional({ description: 'Filter by Property UUID' })
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Filter by Unit UUID' })
  @IsUUID()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ enum: WorkOrderPriority, description: 'Filter by priority level' })
  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ enum: WorkOrderStatus, description: 'Filter by status' })
  @IsEnum(WorkOrderStatus)
  @IsOptional()
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by assigned Vendor UUID' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;
}
