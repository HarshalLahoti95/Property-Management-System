import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSharePercentageDto {
  @ApiProperty({ description: 'The percentage of rent owed to the landlord (0-100)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  landlordSharePercentage: number;
}
