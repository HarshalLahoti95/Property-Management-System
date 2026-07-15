'use client';
import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { 
  usePortfolioDashboard,
  PortfolioFilters,
  PortfolioSummaryCards,
  PendingDisbursementsTable
} from '@/features/portfolio';
import type { PortfolioDashboardQuery } from '@/features/portfolio/types';

export default function PortfolioDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Route protection - ADMIN or LANDLORD only
  React.useEffect(() => {
    if (user && !['ADMIN', 'LANDLORD'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const [filters, setFilters] = React.useState<PortfolioDashboardQuery>({
    startDate: undefined,
    endDate: undefined,
    landlordId: undefined,
  });

  const { data, isLoading } = usePortfolioDashboard(filters);

  if (!user || !['ADMIN', 'LANDLORD'].includes(user.role)) {
    return null;
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Portfolio Dashboard</h2>
      </div>
      
      <p className="text-muted-foreground">
        Overview of financial performance, cash collected, and pending landlord disbursements.
      </p>

      <PortfolioFilters filters={filters} onFilterChange={setFilters} />

      <PortfolioSummaryCards data={data} isLoading={isLoading} />

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Pending Disbursements</h3>
        <PendingDisbursementsTable 
          disbursements={data?.pendingDisbursements || []} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
