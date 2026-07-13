import { useQuery } from '@tanstack/react-query';
import { reportingKeys } from './reportingKeys';
import { reportingService } from '../services/reporting.service';

export function useReportingSummary() {
  return useQuery({
    queryKey: reportingKeys.summary(),
    queryFn: () => reportingService.getSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes cached
  });
}

export function useOccupancyMetrics(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: reportingKeys.occupancy(filters),
    queryFn: () => reportingService.getOccupancy(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFinancialMetrics(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: reportingKeys.financials(filters),
    queryFn: () => reportingService.getFinancials(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMaintenanceMetrics(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: reportingKeys.maintenance(filters),
    queryFn: () => reportingService.getMaintenance(filters),
    staleTime: 5 * 60 * 1000,
  });
}
