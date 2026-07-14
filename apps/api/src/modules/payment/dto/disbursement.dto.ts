import { IsUUID, IsNotEmpty, IsNumber, Min, IsString, IsOptional } from 'class-validator';
import { DisbursementStatus, DisbursementMethod } from '@prisma/client';

export class CreateManualDisbursementDto {
  @IsUUID()
  @IsNotEmpty()
  leaseId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsOptional()
  referenceNote?: string;
}

export class DisbursementCreatedResponseDto {
  disbursementId!: string;
  status!: DisbursementStatus;
  amount!: string;
  newAmountOwed!: string;
  updatedTrustLedgerBalance!: string;
}

export class DisbursementHistoryItemDto {
  id!: string;
  amount!: string;
  status!: DisbursementStatus;
  method!: DisbursementMethod;
  reference!: string | null;
  recordedByUserId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class LeaseDisbursementSummaryDto {
  leaseId!: string;
  currentAmountOwed!: string;
  trustLedgerBalance!: string;
  disbursements!: DisbursementHistoryItemDto[];
}
