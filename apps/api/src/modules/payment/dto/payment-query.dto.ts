import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class PaymentQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter payments by Ledger UUID' })
  @IsUUID()
  @IsOptional()
  ledgerId?: string;

  @ApiPropertyOptional({ description: 'Filter payments by Tenant User UUID' })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter payments by status' })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z', description: 'Filter payments processed on or after date' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z', description: 'Filter payments processed on or before date' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'paymentDate', description: 'Field to sort payments by' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ example: 'desc', description: 'Sort direction' })
  @IsString()
  @IsOptional()
  sortOrder?: string;
}
