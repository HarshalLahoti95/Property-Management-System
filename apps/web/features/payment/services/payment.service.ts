import { apiClient } from '@/lib/api-client';
import { Payment, PaymentAllocation } from '../types';
import { RefundFormValues } from '../schemas';

export const paymentService = {
  async getPayments(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<{
      data: Payment[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/payments', { params });
    return data;
  },

  async getPayment(id: string) {
    const { data } = await apiClient.get<Payment>(`/payments/${id}`);
    return (data as any)?.data || data;
  },

  async recordPayment(values: {
    leaseId: string;
    amount: number;
    method: string;
    reference?: string;
    tenantId?: string;
  }) {
    const { data } = await apiClient.post<Payment>('/payments/record', values);
    return data;
  },

  async refundPayment(id: string, values: RefundFormValues) {
    const formattedValues = {
      reason: values.reason,
      amount: values.amount ? Number(values.amount) : undefined,
    };
    const { data } = await apiClient.post<Payment>(`/payments/${id}/refund`, formattedValues);
    return data;
  },

  async getPaymentAllocations(id: string) {
    const { data } = await apiClient.get<PaymentAllocation[]>(`/payments/${id}/allocations`);
    return (data as any)?.data || data;
  },

};
