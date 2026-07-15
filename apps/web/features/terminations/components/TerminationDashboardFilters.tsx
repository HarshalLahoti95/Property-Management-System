import * as React from 'react';
import type { GetTerminationDashboardQuery, TerminationStatusFilter } from '../types';

interface Props {
  filters: GetTerminationDashboardQuery;
  onFilterChange: (filters: GetTerminationDashboardQuery) => void;
}

export function TerminationDashboardFilters({ filters, onFilterChange }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border">
      <div className="flex flex-col gap-1.5 w-full md:w-auto">
        <label htmlFor="statusFilter" className="text-sm font-medium text-muted-foreground">Status</label>
        <select
          id="statusFilter"
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full md:w-[180px]"
          value={filters.status || ''}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value ? (e.target.value as TerminationStatusFilter) : undefined })}
        >
          <option value="">All (Expired/Terminated)</option>
          <option value="EXPIRED">Expired</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5 w-full md:w-auto">
        <label htmlFor="urgencyFilter" className="text-sm font-medium text-muted-foreground">Urgency</label>
        <select
          id="urgencyFilter"
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full md:w-[180px]"
          value={filters.daysUntilDeadline === undefined ? '' : String(filters.daysUntilDeadline)}
          onChange={(e) => onFilterChange({ ...filters, daysUntilDeadline: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">All Time</option>
          <option value="7">Next 7 Days (or Overdue)</option>
          <option value="30">Next 30 Days (or Overdue)</option>
        </select>
      </div>
    </div>
  );
}
