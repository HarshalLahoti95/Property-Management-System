export type PaymentStatus = 'PENDING' | 'CLEARED' | 'FAILED' | 'REFUNDED';

export type PaymentMethod = 'ACH' | 'CREDIT_CARD' | 'CASH' | 'CHECK';

export interface Payment {
  id: string;
  ledgerId: string;
  tenantId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  status: PaymentStatus;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    fullName: string;
    email: string;
  };
  ledger?: {
    id: string;
    leaseId: string;
  };
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  rentChargeId: string;
  amountAllocated: number;
  allocatedAt: string;
  rentCharge: {
    id: string;
    type: string;
    amount: number;
    description: string;
  };
}
