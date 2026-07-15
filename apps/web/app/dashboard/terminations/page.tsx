'use client';
import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { 
  useTerminationDashboard, 
  TerminationDashboardFilters, 
  TerminationDashboardTable 
} from '@/features/terminations';
import type { GetTerminationDashboardQuery } from '@/features/terminations/types';

export default function TerminationsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Route protection - ADMIN only
  React.useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const [filters, setFilters] = React.useState<GetTerminationDashboardQuery>({
    status: undefined,
    daysUntilDeadline: undefined,
  });

  const { data = [], isLoading } = useTerminationDashboard(filters);

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Terminations Dashboard</h2>
      </div>
      
      <p className="text-muted-foreground">
        Monitor expired and terminated leases to ensure grace period deadlines and final disbursements are handled promptly.
      </p>

      <TerminationDashboardFilters filters={filters} onFilterChange={setFilters} />

      <TerminationDashboardTable data={data} isLoading={isLoading} />
    </div>
  );
}
