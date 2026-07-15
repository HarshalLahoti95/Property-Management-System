import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLandlords } from '@/features/property/hooks/use-properties';
import type { PortfolioDashboardQuery } from '../types';

interface Props {
  filters: PortfolioDashboardQuery;
  onFilterChange: (filters: PortfolioDashboardQuery) => void;
}

export function PortfolioFilters({ filters, onFilterChange }: Props) {
  const { user } = useAuth();
  const { data: landlords = [], isLoading: landlordsLoading } = useLandlords();

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border">
      
      {/* Date Range Filters */}
      <div className="flex flex-col gap-1.5 w-full md:w-auto">
        <label htmlFor="startDate" className="text-sm font-medium text-muted-foreground">Start Date</label>
        <input
          id="startDate"
          type="date"
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full md:w-[160px]"
          value={filters.startDate || ''}
          onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5 w-full md:w-auto">
        <label htmlFor="endDate" className="text-sm font-medium text-muted-foreground">End Date</label>
        <input
          id="endDate"
          type="date"
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full md:w-[160px]"
          value={filters.endDate || ''}
          onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || undefined })}
        />
      </div>

      {/* Role-Aware Landlord Filter (ADMIN ONLY) */}
      {user?.role === 'ADMIN' && (
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label htmlFor="landlordSelect" className="text-sm font-medium text-muted-foreground">Landlord Filter</label>
          <select
            id="landlordSelect"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full md:w-[220px]"
            value={filters.landlordId || ''}
            onChange={(e) => onFilterChange({ ...filters, landlordId: e.target.value || undefined })}
            disabled={landlordsLoading}
          >
            <option value="">All Landlords</option>
            {landlords.map((landlord: any) => (
              <option key={landlord.id} value={landlord.id}>
                {landlord.fullName}
              </option>
            ))}
          </select>
        </div>
      )}
      
    </div>
  );
}
