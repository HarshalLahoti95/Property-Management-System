import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { UnitOccupancyStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ description: 'The unique ID of the unit (only used for updates)', required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: '101', description: 'The unit number' })
  @IsString()
  @IsNotEmpty()
  unitNumber!: string;

  @ApiProperty({ example: 1, description: 'The floor level of the unit' })
  @IsInt()
  @IsNotEmpty()
  floor!: number;

  @ApiProperty({ example: 2, description: 'The number of bedrooms' })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  bedrooms!: number;

  @ApiProperty({ example: 1, description: 'The number of bathrooms' })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  bathrooms!: number;

  @ApiProperty({ example: 850, description: 'The square footage of the unit' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  squareFootage!: number;

  @ApiProperty({ example: 1200.00, description: 'The target rent amount for the unit' })
  @IsNumber()
  @Min(0.0)
  @IsNotEmpty()
  defaultRent!: number;

  @ApiProperty({ enum: UnitOccupancyStatus, example: UnitOccupancyStatus.VACANT, description: 'The occupancy status of the unit', required: false })
  @IsEnum(UnitOccupancyStatus, { message: 'Status must be VACANT, OCCUPIED, NOTICE_GIVEN, or MAINTENANCE' })
  @IsOptional()
  status: UnitOccupancyStatus = UnitOccupancyStatus.VACANT;

  @ApiProperty({ description: 'The landlord owner of this unit', required: false })
  @IsString()
  @IsOptional()
  landlordId?: string;
}
