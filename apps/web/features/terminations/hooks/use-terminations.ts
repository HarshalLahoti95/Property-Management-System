import { useQuery } from '@tanstack/react-query';
import { terminationsService } from '../services/terminations.service';
import type { GetTerminationDashboardQuery } from '../types';

export const terminationKeys = {
  all: ['terminations'] as const,
  dashboard: (params: GetTerminationDashboardQuery) => [...terminationKeys.all, 'dashboard', params] as const,
};

export function useTerminationDashboard(params: GetTerminationDashboardQuery) {
  return useQuery({
    queryKey: terminationKeys.dashboard(params),
    queryFn: () => terminationsService.getDashboard(params),
  });
}
