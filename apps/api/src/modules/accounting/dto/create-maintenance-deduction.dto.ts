import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaintenanceDeductionDto {
  @ApiProperty({ description: 'The UUID of the resolved work order', example: 'uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  workOrderId!: string;
}
