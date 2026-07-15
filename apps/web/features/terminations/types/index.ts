export interface TerminationDashboardTenant {
  name: string;
  email: string;
}

export interface TerminationDashboardItem {
  leaseId: string;
  unitName: string;
  propertyName: string;
  actualEndDate: string; // ISO date string from API
  actualEndDateIsEstimated: boolean;
  tenantGracePeriodDays: number;
  gracePeriodDeadline: string; // ISO date string from API
  isDeadlinePassed: boolean;
  trustBalance: string | number;
  outstandingTenantDebt: string | number;
  amountOwedToLandlord: string | number;
  tenants: TerminationDashboardTenant[];
}

export type TerminationStatusFilter = 'EXPIRED' | 'TERMINATED';

export interface GetTerminationDashboardQuery {
  propertyId?: string;
  status?: TerminationStatusFilter;
  daysUntilDeadline?: number;
}
