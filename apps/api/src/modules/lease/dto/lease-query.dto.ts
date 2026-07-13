import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaseStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LeaseQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number for paginated results' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ example: 10, description: 'Limit count per page for results' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit = 10;

  @ApiPropertyOptional({ enum: LeaseStatus, description: 'Filter leases by specific status' })
  @IsEnum(LeaseStatus)
  @IsOptional()
  status?: LeaseStatus;

  @ApiPropertyOptional({ description: 'Filter leases by specific Unit UUID' })
  @IsUUID()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Lease field to sort results by' })
  @IsString()
  @IsOptional()
  sortBy = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', description: 'Order of sorting (asc or desc)' })
  @IsString()
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'desc';
}
