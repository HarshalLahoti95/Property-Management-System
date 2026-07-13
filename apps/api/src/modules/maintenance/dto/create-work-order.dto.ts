import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderPriority } from '@prisma/client';

export class CreateWorkOrderDto {
  @ApiPropertyOptional({ example: 'property-uuid-here', description: 'Target property ID (Required if unitId is not supplied)' })
  @IsUUID()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ example: 'unit-uuid-here', description: 'Target unit ID (Required if propertyId is not supplied)' })
  @IsUUID()
  @IsOptional()
  unitId?: string;

  @ApiProperty({ example: 'Leaking kitchen faucet', description: 'Title of the maintenance request' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'The faucet in the kitchen is dripping continuously, causing water waste.', description: 'Detailed description of the issue' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: WorkOrderPriority, example: WorkOrderPriority.MEDIUM, description: 'Priority level of the work order' })
  @IsEnum(WorkOrderPriority)
  @IsNotEmpty()
  priority!: WorkOrderPriority;

  @ApiPropertyOptional({ example: 150.00, description: 'Estimated repair cost (must be non-negative)' })
  @IsNumber()
  @Min(0.0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ example: '2026-07-15T00:00:00.000Z', description: 'Target completion date' })
  @IsDateString()
  @IsOptional()
  targetCompletionDate?: string;

  @ApiPropertyOptional({ type: [String], example: ['doc-uuid-1'], description: 'Optional list of referenced document IDs' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  documentIds?: string[];
}
