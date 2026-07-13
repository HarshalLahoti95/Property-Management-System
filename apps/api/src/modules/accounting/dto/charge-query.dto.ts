import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChargeStatus, ChargeType } from '@prisma/client';

export class ChargeQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter charges by Lease UUID' })
  @IsUUID()
  @IsOptional()
  leaseId?: string;

  @ApiPropertyOptional({ description: 'Filter charges by Ledger UUID' })
  @IsUUID()
  @IsOptional()
  ledgerId?: string;

  @ApiPropertyOptional({ enum: ChargeStatus, description: 'Filter charges by status' })
  @IsEnum(ChargeStatus)
  @IsOptional()
  status?: ChargeStatus;

  @ApiPropertyOptional({ enum: ChargeType, description: 'Filter charges by type' })
  @IsEnum(ChargeType)
  @IsOptional()
  type?: ChargeType;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z', description: 'Filter charges due on or after date' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z', description: 'Filter charges due on or before date' })
  @IsString()
  @IsOptional()
  endDate?: string;
}
