import * as React from 'react';
import { PaymentAllocation } from '../types';
import { DataTable, Column } from '@/components/ui/data-table';

export function PaymentAllocationTable({
  allocations = [],
  loading = false,
}: {
  allocations: PaymentAllocation[];
  loading?: boolean;
}) {
  const columns: Column<PaymentAllocation>[] = [
    {
      header: 'Charge Category',
      cell: (item) => (
        <span className="font-semibold capitalize text-foreground">
          {item.rentCharge?.type?.replace('_', ' ').toLowerCase() || 'Charge'}
        </span>
      ),
    },
    {
      header: 'Description',
      cell: (item) => item.rentCharge?.description || 'N/A',
    },
    {
      header: 'Amount Allocated',
      cell: (item) => (
        <span className="font-semibold text-emerald-600">
          ₹{Number(item.amountAllocated).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Allocated Date',
      cell: (item) => new Date(item.allocatedAt).toLocaleString(),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={allocations}
      loading={loading}
      emptyMessage="No payment allocations found. This payment may not have cleared any outstanding charges yet."
    />
  );
}
