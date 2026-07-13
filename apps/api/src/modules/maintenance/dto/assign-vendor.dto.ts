import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignVendorDto {
  @ApiPropertyOptional({ example: 'vendor-uuid-here', description: 'The UUID of the vendor to assign (or null to unassign)' })
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'Assigning to specialist electrician', description: 'Audit comment or reason for this assignment' })
  @IsString()
  @IsOptional()
  reasonDescription?: string;
}
