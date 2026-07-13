import { apiClient } from '@/lib/api-client';
import { Lease, LeaseStatus } from '../types';
import { LeaseFormValues } from '../schemas';

export const leaseService = {
  async getLeases(filters?: Record<string, any>): Promise<Lease[]> {
    const { data } = await apiClient.get<any>('/leases', { params: filters });
    return data.data || data;
  },

  async getLease(id: string): Promise<Lease> {
    const { data } = await apiClient.get<any>(`/leases/${id}`);
    return data.data || data;
  },

  async getLeaseDocuments(id: string) {
    const { data } = await apiClient.get<any>(`/leases/${id}/documents`);
    return data.data || data;
  },

  async createLease(values: LeaseFormValues) {
    const { data } = await apiClient.post<Lease>('/leases', values);
    return data;
  },

  async updateLease(id: string, values: Partial<LeaseFormValues>) {
    const { data } = await apiClient.patch<Lease>(`/leases/${id}`, values);
    return data;
  },

  async deleteLease(id: string) {
    const { data } = await apiClient.delete(`/leases/${id}`);
    return data;
  },

  async transitionStatus(id: string, status: LeaseStatus, reasonDescription?: string) {
    const { data } = await apiClient.post(`/leases/${id}/status`, { status, reasonDescription });
    return data;
  },
};
