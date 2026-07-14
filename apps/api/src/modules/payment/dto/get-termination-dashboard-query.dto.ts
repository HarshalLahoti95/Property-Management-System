import { IsOptional, IsUUID, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TerminationStatusFilter {
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export class GetTerminationDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ enum: TerminationStatusFilter })
  @IsOptional()
  @IsEnum(TerminationStatusFilter)
  status?: TerminationStatusFilter;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  daysUntilDeadline?: number;
}
