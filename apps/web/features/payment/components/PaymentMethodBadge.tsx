import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { PaymentMethod } from '../types';

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const labelMap: Record<PaymentMethod, string> = {
    ACH: 'ACH',
    CREDIT_CARD: 'Credit Card',
    CASH: 'Cash',
    CHECK: 'Check',
  };

  return (
    <Badge variant="outline" className="uppercase font-semibold tracking-wide">
      {labelMap[method] || method}
    </Badge>
  );
}
