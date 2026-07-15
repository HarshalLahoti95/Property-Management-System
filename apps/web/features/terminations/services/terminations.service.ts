import { apiClient } from '@/lib/api-client';
import type { TerminationDashboardItem, GetTerminationDashboardQuery } from '../types';

export const terminationsService = {
  async getDashboard(params?: GetTerminationDashboardQuery): Promise<TerminationDashboardItem[]> {
    const { data } = await apiClient.get<TerminationDashboardItem[]>('/v1/accounting/terminations/dashboard', {
      params,
    });
    return data;
  }
};
