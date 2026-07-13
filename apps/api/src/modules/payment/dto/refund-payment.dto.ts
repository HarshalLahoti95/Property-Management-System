import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiPropertyOptional({ example: 1200.00, description: 'The monetary amount of the refund (must be greater than 0, defaults to full payment amount if not specified)' })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiProperty({ example: 'Security deposit refund upon lease expiration', description: 'Description or reason for processing the refund' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
