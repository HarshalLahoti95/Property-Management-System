import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { WorkOrderStatus } from '../types';

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const labelMap: Record<WorkOrderStatus, string> = {
    SUBMITTED: 'Submitted',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    ON_HOLD: 'On Hold',
    RESOLVED: 'Resolved',
    CANCELLED: 'Cancelled',
  };

  const variantMap: Record<
    WorkOrderStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    SUBMITTED: 'outline',
    ASSIGNED: 'secondary',
    IN_PROGRESS: 'default',
    ON_HOLD: 'destructive',
    RESOLVED: 'default',
    CANCELLED: 'secondary',
  };

  return (
    <Badge variant={variantMap[status]} className="capitalize">
      {labelMap[status] || status}
    </Badge>
  );
}
