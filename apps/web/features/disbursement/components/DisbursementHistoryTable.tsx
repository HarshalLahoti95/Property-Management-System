import * as React from 'react';
import { DisbursementHistoryItem } from '../types';
import { DataTable, Column } from '@/components/ui/data-table';

export function DisbursementHistoryTable({
  disbursements = [],
  loading = false,
}: {
  disbursements: DisbursementHistoryItem[];
  loading?: boolean;
}) {
  const columns: Column<DisbursementHistoryItem>[] = [
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (item) => `₹${Number(item.amount).toFixed(2)}`,
    },
    {
      header: 'Method',
      accessorKey: 'method',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          item.status === 'PAID' ? 'bg-green-100 text-green-800' :
          item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {item.status}
        </span>
      ),
    },
    {
      header: 'Reference',
      accessorKey: 'reference',
      cell: (item) => item.reference || '-',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={disbursements}
      loading={loading}
      emptyMessage="No disbursements recorded for this lease."
    />
  );
}
