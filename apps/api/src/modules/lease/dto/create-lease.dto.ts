import { IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaseDto {
  @ApiProperty({ example: 'unit-uuid-here', description: 'The UUID of the unit being leased' })
  @IsUUID()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z', description: 'Lease start date' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: '2027-07-01T00:00:00.000Z', description: 'Lease end date' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiProperty({ example: 1500.00, description: 'Monthly rent charge amount' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  monthlyRent!: number;

  @ApiProperty({ example: 1500.00, description: 'Security deposit amount' })
  @IsNumber()
  @Min(0.0)
  @IsNotEmpty()
  securityDeposit!: number;

  @ApiProperty({ example: 1, description: 'Day of the month when rent is due' })
  @IsInt()
  @Min(1)
  @Max(31)
  @IsNotEmpty()
  rentDueDay!: number;

  @ApiProperty({ example: 5, description: 'Grace period in days before late fees apply' })
  @IsInt()
  @Min(0)
  @Max(30)
  @IsNotEmpty()
  gracePeriodDays!: number;

  @ApiProperty({ type: [String], example: ['tenant-uuid-here'], description: 'Array of tenant User UUIDs' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty({ each: true })
  tenantIds!: string[];
}
