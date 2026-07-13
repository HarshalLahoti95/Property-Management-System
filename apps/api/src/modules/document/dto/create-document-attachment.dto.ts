import { IsEnum, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseDocumentPurpose } from '@prisma/client';

export enum AttachmentEntityType {
  LEASE = 'LEASE',
  USER = 'USER',
  WORK_ORDER = 'WORK_ORDER',
  PAYMENT = 'PAYMENT',
}

export class CreateDocumentAttachmentDto {
  @ApiProperty({ enum: AttachmentEntityType, example: AttachmentEntityType.LEASE, description: 'Target entity type to link the document to' })
  @IsEnum(AttachmentEntityType)
  @IsNotEmpty()
  entityType!: AttachmentEntityType;

  @ApiProperty({ example: 'target-uuid-here', description: 'The UUID of the target business entity' })
  @IsUUID()
  @IsNotEmpty()
  entityId!: string;

  @ApiPropertyOptional({ enum: LeaseDocumentPurpose, description: 'Required only when entityType is LEASE' })
  @IsOptional()
  @IsEnum(LeaseDocumentPurpose)
  purpose?: LeaseDocumentPurpose;
}
