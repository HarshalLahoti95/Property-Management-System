import * as React from 'react';
import { WorkOrder } from '../types';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/data-table';

export function WorkOrderTable({
  workOrders = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
}: {
  workOrders: WorkOrder[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const columns: Column<WorkOrder>[] = [
    {
      header: 'Request #',
      accessorKey: 'workOrderNumber',
      cell: (item) => <span className="font-semibold font-mono">{item.workOrderNumber}</span>,
      sortable: true,
    },
    {
      header: 'Title',
      accessorKey: 'title',
      cell: (item) => (
        <div className="max-w-[200px] truncate">
          <p className="font-medium text-foreground truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Location',
      cell: (item) => {
        const propName = item.property?.name || 'N/A';
        const unitName = item.unit?.unitNumber ? ` - Unit ${item.unit.unitNumber}` : '';
        return <span className="text-xs">{propName}{unitName}</span>;
      },
    },
    {
      header: 'Priority',
      accessorKey: 'priority',
      cell: (item) => <PriorityBadge priority={item.priority} />,
      sortable: true,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => <WorkOrderStatusBadge status={item.status} />,
      sortable: true,
    },
    {
      header: 'Submitted',
      accessorKey: 'createdAt',
      cell: (item) => new Date(item.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      header: 'Target Date',
      accessorKey: 'targetCompletionDate',
      cell: (item) =>
        item.targetCompletionDate ? new Date(item.targetCompletionDate).toLocaleDateString() : 'N/A',
      sortable: true,
    },
    {
      header: 'Actions',
      cell: (item) => (
        <Link href={`/dashboard/maintenance/${item.id}`}>
          <Button variant="outline" size="sm">
            Details
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={workOrders}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="No maintenance work orders found."
    />
  );
}
