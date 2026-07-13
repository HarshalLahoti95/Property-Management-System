import { IsEmail, IsEnum, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'tenant@pms.com', description: 'The email address used to request the OTP' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456', description: 'The 6-digit OTP code received' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP code must be a 6-digit number' })
  code!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.TENANT, description: 'The role context for authentication' })
  @IsEnum([UserRole.LANDLORD, UserRole.TENANT], { message: 'Role must be either LANDLORD or TENANT' })
  @IsNotEmpty()
  role!: UserRole;
}
