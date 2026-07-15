import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { PortfolioDashboardData } from '../types';

interface Props {
  data?: PortfolioDashboardData;
  isLoading: boolean;
}

export function PortfolioSummaryCards({ data, isLoading }: Props) {
  const { user } = useAuth();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="h-4 w-24 bg-secondary rounded-md mb-4" />
            <div className="h-8 w-32 bg-secondary rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${user?.role === 'ADMIN' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Total Collected</h3>
        <p className="text-3xl font-bold mt-2 text-foreground">
          ${Number(data.totalCollected).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Owed to Landlords</h3>
        <p className="text-3xl font-bold mt-2 text-foreground">
          ${Number(data.totalOwedToLandlords).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Maintenance Deductions</h3>
        <p className="text-3xl font-bold mt-2 text-foreground">
          ${Number(data.totalMaintenanceDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {user?.role === 'ADMIN' && data.companyRetainedBalance !== undefined && (
        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Company Retained</h3>
          <p className="text-3xl font-bold mt-2 text-primary">
            ${Number(data.companyRetainedBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );
}
