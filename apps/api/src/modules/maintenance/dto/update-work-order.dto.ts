import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority } from '@prisma/client';

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ example: 'Leaking kitchen faucet', description: 'Updated title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Detailed description of the issue', description: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: WorkOrderPriority, example: WorkOrderPriority.HIGH, description: 'Updated priority' })
  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ example: 175.00, description: 'Updated estimated cost (must be non-negative)' })
  @IsNumber()
  @Min(0.0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 190.50, description: 'Actual cost (must be non-negative, only recorded once work begins)' })
  @IsNumber()
  @Min(0.0)
  @IsOptional()
  actualCost?: number;

  @ApiPropertyOptional({ example: '2026-07-20T00:00:00.000Z', description: 'Updated target completion date' })
  @IsDateString()
  @IsOptional()
  targetCompletionDate?: string;

  @ApiPropertyOptional({ example: '2026-07-18T00:00:00.000Z', description: 'Actual completion date' })
  @IsDateString()
  @IsOptional()
  actualCompletionDate?: string;

  @ApiPropertyOptional({ type: [String], example: ['doc-uuid-1'], description: 'Updated list of document IDs' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  documentIds?: string[];
}
