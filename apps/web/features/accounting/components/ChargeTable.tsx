import * as React from 'react';
import { RentCharge } from '../types';
import { ChargeStatusBadge } from './ChargeStatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from '@/components/ui/data-table';

export function ChargeTable({
  charges = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
  onSelectCharge,
}: {
  charges: RentCharge[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSelectCharge?: (charge: RentCharge) => void;
}) {
  const columns: Column<RentCharge>[] = [
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (item) => <span className="font-medium capitalize">{item.type.replace('_', ' ').toLowerCase()}</span>,
      sortable: true,
    },
    {
      header: 'Description',
      accessorKey: 'description',
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (item) => `₹${Number(item.amount).toFixed(2)}`,
      sortable: true,
    },
    {
      header: 'Paid Amount',
      cell: (item) => `₹${Number(item.paidAmount).toFixed(2)}`,
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      cell: (item) => new Date(item.dueDate).toLocaleDateString(),
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => <ChargeStatusBadge status={item.status} />,
      sortable: true,
    },
    {
      header: 'Actions',
      cell: (item) => (
        onSelectCharge && (
          <Button variant="outline" size="sm" onClick={() => onSelectCharge(item)}>
            Details
          </Button>
        )
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={charges}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="No ledger charges found."
    />
  );
}
