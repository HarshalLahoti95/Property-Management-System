import * as React from 'react';
import { NotificationHistory } from '../types';
import { NotificationStatusBadge } from './NotificationStatusBadge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/data-table';

export function NotificationHistoryTable({
  notifications = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
}: {
  notifications: NotificationHistory[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const columns: Column<NotificationHistory>[] = [
    {
      header: 'Subject',
      accessorKey: 'subject',
      cell: (item) => (
        <div className="max-w-[250px] truncate">
          <p className="font-semibold text-foreground truncate">{item.subject}</p>
          <p className="text-xs text-muted-foreground truncate">{item.template}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Recipient',
      accessorKey: 'recipient',
      cell: (item) => <span className="font-medium">{item.recipient}</span>,
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => <NotificationStatusBadge status={item.status} />,
      sortable: true,
    },
    {
      header: 'Dispatched',
      accessorKey: 'createdAt',
      cell: (item) => new Date(item.createdAt).toLocaleString(),
      sortable: true,
    },
    {
      header: 'Actions',
      cell: (item) => (
        <Link href={`/dashboard/notifications/${item.id}`}>
          <Button variant="outline" size="sm">
            View details
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={notifications}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="No notification logs found."
    />
  );
}
