import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'The tenant confirmed the leakage is resolved.', description: 'The text body of the comment' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
