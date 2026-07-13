import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitOccupancyStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UnitQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number for paginated listings' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ example: 10, description: 'Limit count per page for listings' })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit = 10;

  @ApiPropertyOptional({ enum: UnitOccupancyStatus, description: 'Filter units by specific occupancyStatus' })
  @IsEnum(UnitOccupancyStatus)
  @IsOptional()
  status?: UnitOccupancyStatus;

  @ApiPropertyOptional({ example: 'unitNumber', description: 'Unit field to sort results by' })
  @IsString()
  @IsOptional()
  sortBy = 'unitNumber';

  @ApiPropertyOptional({ example: 'asc', description: 'Order of sorting (asc or desc)' })
  @IsString()
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'asc';
}
