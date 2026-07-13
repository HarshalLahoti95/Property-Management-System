export type ChargeStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';

export type ChargeType = 'RENT' | 'SECURITY_DEPOSIT' | 'LATE_FEE' | 'UTILITY' | 'MAINTENANCE' | 'MISC';

export type LedgerType = 'OPERATING' | 'TRUST';

export interface FinancialLedger {
  id: string;
  leaseId: string;
  ledgerType: LedgerType;
  runningBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface RentCharge {
  id: string;
  ledgerId: string;
  dueDate: string;
  type: ChargeType;
  amount: number;
  paidAmount: number;
  status: ChargeStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  ledger?: FinancialLedger;
}

export interface LedgerBalanceHistory {
  id: string;
  ledgerId: string;
  oldBalance: number;
  newBalance: number;
  triggerEventType: string;
  triggerEventId: string;
  createdAt: string;
}

export interface LeaseSummary {
  operatingBalance: number;
  trustBalance: number;
  outstandingCharges: Array<{
    id: string;
    type: ChargeType;
    amount: number;
    dueDate: string;
    status: ChargeStatus;
  }>;
  nextDueCharge: {
    id: string;
    type: ChargeType;
    amount: number;
    dueDate: string;
  } | null;
  chargeCounts: Record<ChargeStatus, number>;
}
