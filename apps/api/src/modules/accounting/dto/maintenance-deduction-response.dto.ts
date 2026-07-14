import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceDeductionResponseDto {
  @ApiProperty({ description: 'The UUID of the newly created deduction record' })
  id!: string;

  @ApiProperty({ description: 'The active lease this deduction is tied to' })
  leaseId!: string;

  @ApiProperty({ description: 'The amount deducted (matches work order actualCost)' })
  amount!: number;

  @ApiProperty({ description: 'The timestamp this deduction was applied' })
  deductionMonth!: Date;
}
