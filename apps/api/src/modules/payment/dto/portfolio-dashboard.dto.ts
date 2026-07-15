import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class PortfolioDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Start date for filtering totals like rent collected' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering totals like rent collected' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Specific landlord to filter by (ADMIN only)' })
  @IsOptional()
  @IsUUID()
  landlordId?: string;
}

export class PendingDisbursementDto {
  @ApiProperty()
  leaseId: string;

  @ApiProperty()
  propertyName: string;

  @ApiProperty()
  unitName: string;

  @ApiProperty()
  amountOwed: number;
}

export class PortfolioDashboardResponseDto {
  @ApiProperty({ description: 'Total gross cash collected (cash-basis)' })
  totalCollected: number;

  @ApiProperty({ description: 'Total pending disbursements currently owed to landlords' })
  totalOwedToLandlords: number;

  @ApiPropertyOptional({ description: 'Total company net retained balance (stripped for LANDLORD role)' })
  companyRetainedBalance?: number;

  @ApiProperty({ description: 'Total maintenance deductions matching the date range' })
  totalMaintenanceDeductions: number;

  @ApiProperty({ type: [PendingDisbursementDto] })
  pendingDisbursements: PendingDisbursementDto[];
}
