export interface PendingDisbursement {
  leaseId: string;
  propertyName: string;
  unitName: string;
  amountOwed: number | string;
}

export interface PortfolioDashboardData {
  totalCollected: number | string;
  totalOwedToLandlords: number | string;
  companyRetainedBalance?: number | string;
  totalMaintenanceDeductions: number | string;
  pendingDisbursements: PendingDisbursement[];
}

export interface PortfolioDashboardQuery {
  startDate?: string;
  endDate?: string;
  landlordId?: string;
}
