import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { PaymentStatus } from '../types';

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const labelMap: Record<PaymentStatus, string> = {
    PENDING: 'Pending',
    CLEARED: 'Cleared',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
  };

  const variantMap: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    CLEARED: 'default',
    PENDING: 'outline',
    FAILED: 'destructive',
    REFUNDED: 'secondary',
  };

  return (
    <Badge variant={variantMap[status]} className="capitalize">
      {labelMap[status] || status}
    </Badge>
  );
}
