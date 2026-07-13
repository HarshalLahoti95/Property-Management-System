import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: 'tenant@pms.com', description: 'The email address to receive the OTP' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.TENANT, description: 'The role context for authentication' })
  @IsEnum([UserRole.LANDLORD, UserRole.TENANT], { message: 'Role must be either LANDLORD or TENANT' })
  @IsNotEmpty()
  role!: UserRole;
}
