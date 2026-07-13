import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({ example: 'ledger-uuid-here', description: 'The UUID of the ledger this payment applies to' })
  @IsUUID()
  @IsNotEmpty()
  ledgerId!: string;

  @ApiPropertyOptional({ example: 'tenant-uuid-here', description: 'The UUID of the tenant making the payment (defaults to current user if Tenant)' })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({ example: 1200.00, description: 'The monetary amount of the payment (must be greater than 0)' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.ACH, description: 'The method used to submit the payment' })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN-982347923', description: 'Unique transaction or gateway reference ID' })
  @IsString()
  @IsOptional()
  transactionReference?: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z', description: 'Date the payment was processed' })
  @IsDateString()
  @IsNotEmpty()
  paymentDate!: string;
}
