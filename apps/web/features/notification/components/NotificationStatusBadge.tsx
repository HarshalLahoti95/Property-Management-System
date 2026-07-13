import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { NotificationStatus } from '../types';

export function NotificationStatusBadge({ status }: { status: NotificationStatus }) {
  const labelMap: Record<NotificationStatus, string> = {
    SENT: 'Sent',
    FAILED: 'Failed',
    PENDING: 'Pending',
  };

  const variantMap: Record<
    NotificationStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
  > = {
    SENT: 'default',
    FAILED: 'destructive',
    PENDING: 'outline',
  };

  return (
    <Badge variant={variantMap[status]} className="capitalize">
      {labelMap[status] || status}
    </Badge>
  );
}
