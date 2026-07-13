import { apiClient } from '@/lib/api-client';
import { ReportingSummary, OccupancyMetrics, FinancialMetrics, MaintenanceMetrics } from '../types';

export const reportingService = {
  async getSummary(): Promise<ReportingSummary> {
    const { data } = await apiClient.get<ReportingSummary>('/reporting/summary');
    return (data as any)?.data || data;
  },

  async getOccupancy(params?: Record<string, unknown>): Promise<OccupancyMetrics> {
    const { data } = await apiClient.get<OccupancyMetrics>('/reporting/occupancy', { params });
    return (data as any)?.data || data;
  },

  async getFinancials(params?: Record<string, unknown>): Promise<FinancialMetrics> {
    const { data } = await apiClient.get<FinancialMetrics>('/reporting/financials', { params });
    return (data as any)?.data || data;
  },

  async getMaintenance(params?: Record<string, unknown>): Promise<MaintenanceMetrics> {
    const { data } = await apiClient.get<MaintenanceMetrics>('/reporting/maintenance', { params });
    return (data as any)?.data || data;
  },

  async downloadLeasesExport(): Promise<{ data: string; filename: string }> {
    const response = await apiClient.get<string>('/reporting/export/leases', {
      responseType: 'text',
    });
    // Parse filename from content-disposition header if available
    const disposition = response.headers['content-disposition'];
    let filename = `leases-report-${Date.now()}.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    return { data: response.data, filename };
  },

  async downloadFinancialsExport(): Promise<{ data: string; filename: string }> {
    const response = await apiClient.get<string>('/reporting/export/financials', {
      responseType: 'text',
    });
    const disposition = response.headers['content-disposition'];
    let filename = `financials-report-${Date.now()}.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    return { data: response.data, filename };
  },
};
