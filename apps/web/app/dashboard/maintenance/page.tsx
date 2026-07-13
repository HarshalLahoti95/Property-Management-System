'use client';
import * as React from 'react';
import { useWorkOrders } from '@/features/maintenance';
import { WorkOrderTable } from '@/features/maintenance';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Wrench, Plus, RefreshCw } from 'lucide-react';

export default function MaintenanceListPage() {
  const [page, setPage] = React.useState(1);
  const [priority, setPriority] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<string>('createdAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const { data, isLoading, refetch } = useWorkOrders({
    page,
    limit: 10,
    priority: priority || undefined,
    status: status || undefined,
    sortBy,
    sortOrder,
  });

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" /> Maintenance Work Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and dispatch repair requests across leased units and property grounds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/dashboard/maintenance/new">
            <Button size="sm" className="h-9 flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Request Work Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg flex-wrap">
        {/* Status filter */}
        <div className="space-y-1">
          <label htmlFor="filter-status" className="text-xs font-semibold text-muted-foreground uppercase">
            Filter Status
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="block w-40 h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Priority filter */}
        <div className="space-y-1">
          <label htmlFor="filter-priority" className="text-xs font-semibold text-muted-foreground uppercase">
            Filter Priority
          </label>
          <select
            id="filter-priority"
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="block w-40 h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-hidden"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="EMERGENCY">Emergency</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <WorkOrderTable
          workOrders={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || 1}
          onPageChange={setPage}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </div>
    </div>
  );
}
