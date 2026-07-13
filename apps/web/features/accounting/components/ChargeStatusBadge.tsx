import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChargeStatus } from '../types';

export function ChargeStatusBadge({ status }: { status: ChargeStatus }) {
  const labelMap: Record<ChargeStatus, string> = {
    PAID: 'Paid',
    UNPAID: 'Unpaid',
    PARTIALLY_PAID: 'Partially Paid',
    VOIDED: 'Voided',
  };

  const variantMap: Record<ChargeStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PAID: 'default',
    PARTIALLY_PAID: 'outline',
    UNPAID: 'secondary',
    VOIDED: 'destructive',
  };

  return (
    <Badge variant={variantMap[status]} className="capitalize">
      {labelMap[status] || status}
    </Badge>
  );
}
