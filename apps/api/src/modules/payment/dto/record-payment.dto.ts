import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class RecordPaymentDto {
  @ApiProperty({ description: 'The UUID of the lease to record the payment against' })
  @IsUUID()
  leaseId!: string;

  @ApiProperty({ description: 'The UUID of the specific tenant making the payment' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ description: 'The exact amount to pay, matching the oldest unsettled billing month total' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, description: 'The method of payment' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Optional transaction reference. If omitted, one will be auto-generated.' })
  @IsString()
  @IsOptional()
  reference?: string;
}
