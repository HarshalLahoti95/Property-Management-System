import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustChargeDto {
  @ApiProperty({ example: 20.00, description: 'The amount to credit adjust off the charge' })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ example: 'Overcharged utility bill correction', description: 'Reason for the adjustment' })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
