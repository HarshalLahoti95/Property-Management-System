import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChargeType } from '@prisma/client';

export class CreateChargeDto {
  @ApiProperty({ example: 'lease-uuid-here', description: 'The UUID of the lease this charge belongs to' })
  @IsUUID()
  @IsNotEmpty()
  leaseId!: string;

  @ApiProperty({ enum: ChargeType, example: ChargeType.UTILITY, description: 'The type/category of the charge' })
  @IsEnum(ChargeType)
  @IsNotEmpty()
  type!: ChargeType;

  @ApiProperty({ example: 120.50, description: 'The monetary amount of the charge (must be greater than 0)' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ example: '2026-07-05T00:00:00.000Z', description: 'Due date for payment of this charge' })
  @IsDateString()
  @IsNotEmpty()
  dueDate!: string;

  @ApiProperty({ example: 'Water bill for June 2026', description: 'Description/reason for the charge' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
