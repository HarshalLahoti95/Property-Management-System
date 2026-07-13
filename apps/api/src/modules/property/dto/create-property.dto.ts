import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, PropertyLayout } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUnitDto } from '../../unit/dto/create-unit.dto';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Sunset Heights Apartments', description: 'The display name of the property' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.RESIDENTIAL, description: 'The property classification type' })
  @IsEnum(PropertyType, { message: 'Type must be RESIDENTIAL or COMMERCIAL' })
  @IsNotEmpty()
  type!: PropertyType;

  @ApiProperty({ example: '123 Main Street', description: 'The street address line' })
  @IsString()
  @IsNotEmpty()
  streetAddress!: string;

  @ApiProperty({ example: 'Austin', description: 'The city' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'MH', description: 'The state code or name' })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({ example: '400001', description: 'The 6-digit Indian PIN code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Postal code must be a valid 6-digit PIN code' })
  zipCode!: string;

  @ApiProperty({ example: 'uuid-landlord-id', description: 'Associated landlord user ID (Only processable by ADMIN)', required: false })
  @IsString()
  @IsOptional()
  landlordId?: string;

  @ApiProperty({ enum: PropertyLayout, example: PropertyLayout.MULTI_UNIT, description: 'Layout of the property', required: false })
  @IsEnum(PropertyLayout, { message: 'Layout must be STANDALONE or MULTI_UNIT' })
  @IsOptional()
  layout?: PropertyLayout;

  @ApiProperty({ type: [CreateUnitDto], description: 'Optional list of units to create alongside the property', required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateUnitDto)
  units?: CreateUnitDto[];
}
