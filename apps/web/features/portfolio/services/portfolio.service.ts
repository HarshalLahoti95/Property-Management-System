import { apiClient } from '@/lib/api-client';
import type { PortfolioDashboardData, PortfolioDashboardQuery } from '../types';

export const portfolioService = {
  async getDashboard(params?: PortfolioDashboardQuery): Promise<PortfolioDashboardData> {
    const { data } = await apiClient.get<PortfolioDashboardData>('/v1/accounting/portfolio/dashboard', {
      params,
    });
    return data;
  }
};
