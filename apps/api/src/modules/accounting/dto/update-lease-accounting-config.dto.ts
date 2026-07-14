import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateLeaseAccountingConfigDto {
  @ApiPropertyOptional({ description: 'Grace period (in days) for tenant security deposit returns' })
  @IsOptional()
  @IsInt()
  @Min(0)
  tenantGracePeriodDays?: number;

  @ApiPropertyOptional({ description: 'Grace period (in days) for final company disbursements' })
  @IsOptional()
  @IsInt()
  @Min(0)
  companyGracePeriodDays?: number;
}
