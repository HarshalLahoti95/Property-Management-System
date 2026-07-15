export type DisbursementStatus = 'PENDING' | 'PAID' | 'FAILED';
export type DisbursementMethod = 'MANUAL' | 'STRIPE' | 'RAZORPAY';

export interface DisbursementHistoryItem {
  id: string;
  amount: string;
  status: DisbursementStatus;
  method: DisbursementMethod;
  reference: string | null;
  recordedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseDisbursementSummary {
  leaseId: string;
  currentAmountOwed: string;
  trustLedgerBalance: string;
  disbursements: DisbursementHistoryItem[];
}

export interface CreateManualDisbursementPayload {
  leaseId: string;
  amount: number;
  referenceNote?: string;
}

export interface DisbursementCreatedResponse {
  disbursementId: string;
  status: DisbursementStatus;
  amount: string;
  newAmountOwed: string;
  updatedTrustLedgerBalance: string;
}
