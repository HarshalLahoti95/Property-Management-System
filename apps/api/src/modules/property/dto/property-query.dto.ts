import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PropertyQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter properties by text match on name/address/city' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: PropertyType, description: 'Filter properties by specific PropertyType' })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Property field to sort results by' })
  @IsString()
  @IsOptional()
  sortBy = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', description: 'Order of sorting (asc or desc)' })
  @IsString()
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'desc';
}
