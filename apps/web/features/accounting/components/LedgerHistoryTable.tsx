import * as React from 'react';
import { LedgerBalanceHistory } from '../types';
import { DataTable, Column } from '@/components/ui/data-table';

export function LedgerHistoryTable({
  histories = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
}: {
  histories: LedgerBalanceHistory[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}) {
  const columns: Column<LedgerBalanceHistory>[] = [
    {
      header: 'Date',
      cell: (item) => new Date(item.createdAt).toLocaleString(),
    },
    {
      header: 'Event',
      cell: (item) => (
        <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">
          {item.triggerEventType}
        </span>
      ),
    },
    {
      header: 'Starting Balance',
      cell: (item) => `₹${Number(item.oldBalance).toFixed(2)}`,
    },
    {
      header: 'Net Change',
      cell: (item) => {
        const diff = Number(item.newBalance) - Number(item.oldBalance);
        const isPositive = diff > 0;
        return (
          <span className={isPositive ? 'text-primary font-medium' : 'text-emerald-600 font-medium'}>
            {isPositive ? '+' : ''}₹{diff.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: 'Ending Balance',
      cell: (item) => `₹${Number(item.newBalance).toFixed(2)}`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={histories}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      emptyMessage="No ledger history recorded."
    />
  );
}
