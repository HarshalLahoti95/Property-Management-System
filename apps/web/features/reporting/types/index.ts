export interface ReportingSummary {
  occupancyRate: number;
  occupiedUnits: number;
  totalUnits: number;
  totalCharged: number;
  totalPaid: number;
  outstandingBalance: number;
  collectionRate: number;
  openWorkOrders: number;
  emergencyWorkOrders: number;
}

export interface OccupancyLeaseExpiration {
  leaseId: string;
  property: string;
  unit: string;
  endDate: string;
  tenants: string[];
}

export interface OccupancyMetrics {
  occupiedUnits: number;
  totalUnits: number;
  occupancyRate: number;
  expirationsNext30Days: OccupancyLeaseExpiration[];
}

export interface PaymentTrend {
  month: string;
  amount: number;
}

export interface FinancialMetrics {
  totalCharged: number;
  totalPaid: number;
  outstanding: number;
  collectionRate: number;
  paymentTrends: PaymentTrend[];
}

export interface MaintenanceMetrics {
  countByStatus: Record<string, number>;
  countByPriority: Record<string, number>;
  averageCompletionTimeDays: number;
  totalEstimatedCost: number;
  totalActualCost: number;
}
