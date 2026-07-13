import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { LeaseStatus } from '../types';

export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
  const labelMap: Record<LeaseStatus, string> = {
    DRAFT: 'Draft',
    PENDING_LANDLORD_APPROVAL: 'Pending Landlord Approval',
    PENDING_TENANT_SIGNATURE: 'Pending Tenant Signature',
    ACTIVE: 'Active',
    PENDING_TERMINATION_APPROVAL: 'Pending Termination',
    EXPIRED: 'Expired',
    TERMINATED: 'Terminated',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
    DECLINED: 'Declined',
  };

  const variantMap: Record<LeaseStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    PENDING_LANDLORD_APPROVAL: 'outline',
    PENDING_TENANT_SIGNATURE: 'outline',
    ACTIVE: 'default',
    PENDING_TERMINATION_APPROVAL: 'destructive',
    EXPIRED: 'destructive',
    TERMINATED: 'destructive',
    CANCELLED: 'secondary', 
    REJECTED: 'outline',
    DECLINED: 'destructive',
  };

  const customColorMap: Partial<Record<LeaseStatus, string>> = {
    REJECTED: 'text-orange-600 border-orange-600 dark:text-orange-400 dark:border-orange-500',
    DECLINED: 'bg-red-600 text-white hover:bg-red-700', // Explicit bright red for tenant declining
  };

  return (
    <Badge variant={variantMap[status]} className={`capitalize ${customColorMap[status] || ''}`}>
      {labelMap[status] || status}
    </Badge>
  );
}
