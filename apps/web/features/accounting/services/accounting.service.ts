import { apiClient } from '@/lib/api-client';
import { LeaseSummary, FinancialLedger, RentCharge, LedgerBalanceHistory } from '../types';
import { ChargeFormValues, AdjustFormValues } from '../schemas';

export const accountingService = {
  async getLeaseSummary(leaseId: string): Promise<LeaseSummary> {
    const { data } = await apiClient.get<LeaseSummary>(`/accounting/leases/${leaseId}/summary`);
    return (data as any)?.data || data;
  },

  async getLedgers(leaseId: string): Promise<FinancialLedger[]> {
    const { data } = await apiClient.get<FinancialLedger[]>(`/accounting/ledgers/lease/${leaseId}`);
    return (data as any)?.data || data;
  },

  async getLedgerHistory(ledgerId: string, params?: { page?: number; limit?: number }) {
    const { data } = await apiClient.get<{
      data: LedgerBalanceHistory[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/accounting/ledgers/${ledgerId}/history`, { params });
    return data;
  },

  async getCharges(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<{
      data: RentCharge[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/accounting/charges', { params });
    return data;
  },

  async createCharge(values: ChargeFormValues) {
    const { data } = await apiClient.post<RentCharge>('/accounting/charges', values);
    return data;
  },

  async voidCharge(id: string) {
    const { data } = await apiClient.post<RentCharge>(`/accounting/charges/${id}/void`);
    return data;
  },

  async adjustCharge(id: string, values: AdjustFormValues) {
    const { data } = await apiClient.post<RentCharge>(`/accounting/charges/${id}/adjust`, values);
    return data;
  },
};
