export type LeaseStatus = 'DRAFT' | 'PENDING_LANDLORD_APPROVAL' | 'PENDING_TENANT_SIGNATURE' | 'ACTIVE' | 'PENDING_TERMINATION_APPROVAL' | 'EXPIRED' | 'TERMINATED' | 'CANCELLED' | 'REJECTED' | 'DECLINED';

export interface LeaseTenant {
  id: string;
  tenantId: string;
  /** Matches LeaseTenantStatus Prisma enum */
  status: 'PENDING' | 'ACTIVE' | 'DECLINED' | 'REMOVED';
  signedAt: string | null;
  tenant: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface Lease {
  id: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number;
  gracePeriodDays: number;
  status: LeaseStatus;
  unit: {
    id: string;
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
  leaseTenants: LeaseTenant[];
  landlord?: {
    id: string;
    fullName: string;
    email: string;
  };
  statusHistories?: LeaseStatusHistory[];
}

export interface LeaseStatusHistory {
  id: string;
  leaseId: string;
  oldStatus: LeaseStatus | null;
  newStatus: LeaseStatus;
  changedByUserId: string;
  changedByUser: {
    fullName: string;
  };
  reasonDescription?: string;
  changedAt: string;
}

export * from './revenue-splits';
