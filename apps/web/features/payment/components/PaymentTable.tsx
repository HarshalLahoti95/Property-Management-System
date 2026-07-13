import * as React from 'react';
import { Payment } from '../types';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/data-table';

export function PaymentTable({
  payments = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
}: {
  payments: Payment[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const columns: Column<Payment>[] = [
    {
      header: 'Tenant',
      cell: (item) => item.tenant?.fullName || 'System User',
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (item) => `₹${Number(item.amount).toFixed(2)}`,
      sortable: true,
    },
    {
      header: 'Method',
      accessorKey: 'paymentMethod',
      cell: (item) => <PaymentMethodBadge method={item.paymentMethod} />,
      sortable: true,
    },
    {
      header: 'Reference ID',
      accessorKey: 'transactionReference',
    },
    {
      header: 'Processed Date',
      accessorKey: 'paymentDate',
      cell: (item) => new Date(item.paymentDate).toLocaleDateString(),
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => <PaymentStatusBadge status={item.status} />,
      sortable: true,
    },
    {
      header: 'Actions',
      cell: (item) => (
        <Link href={`/dashboard/payments/${item.id}`}>
          <Button variant="outline" size="sm">
            View Allocations
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={payments}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="No payments submitted."
    />
  );
}
