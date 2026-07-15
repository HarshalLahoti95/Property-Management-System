import { useQuery } from '@tanstack/react-query';
import { portfolioService } from '../services/portfolio.service';
import type { PortfolioDashboardQuery } from '../types';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  dashboard: (params: PortfolioDashboardQuery) => [...portfolioKeys.all, 'dashboard', params] as const,
};

export function usePortfolioDashboard(params: PortfolioDashboardQuery) {
  return useQuery({
    queryKey: portfolioKeys.dashboard(params),
    queryFn: () => portfolioService.getDashboard(params),
  });
}
