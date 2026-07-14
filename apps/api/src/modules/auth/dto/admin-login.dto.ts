import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com', description: 'The email address of the administrator' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123', description: 'The password of the administrator' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
