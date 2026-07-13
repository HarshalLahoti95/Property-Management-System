import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/payment.service';
import { paymentKeys } from './paymentKeys';
import { RefundFormValues } from '../schemas';
import { Payment, PaymentMethod } from '../types';

export function usePayments(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: () => paymentService.getPayments(filters),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => paymentService.getPayment(id),
    enabled: !!id,
  });
}

interface PaymentListResponse {
  data: Payment[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      ledgerId: string;
      amount: number;
      paymentMethod: string;
      transactionReference?: string;
      paymentDate: string;
      tenantId?: string;
    }) => paymentService.createPayment(values),
    onMutate: async (newPayment) => {
      await queryClient.cancelQueries({ queryKey: paymentKeys.lists() });

      const queryCache = queryClient.getQueryCache().getAll();
      const previousQueriesData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'payment' && entry.queryKey[1] === 'list') {
          previousQueriesData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);
          
          const oldData = queryClient.getQueryData<PaymentListResponse>(entry.queryKey);
          if (oldData && Array.isArray(oldData.data)) {
            const optimisticRecord: Payment = {
              id: 'temp-id-' + Date.now(),
              ledgerId: newPayment.ledgerId,
              tenantId: newPayment.tenantId || '',
              amount: newPayment.amount,
              paymentMethod: newPayment.paymentMethod as PaymentMethod,
              transactionReference: newPayment.transactionReference || 'PENDING',
              status: 'CLEARED',
              paymentDate: newPayment.paymentDate,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            queryClient.setQueryData(entry.queryKey, {
              ...oldData,
              data: [optimisticRecord, ...oldData.data],
            });
          }
        }
      });

      return { previousQueriesData };
    },
    onError: (err, newPayment, context) => {
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

export function useRefundPayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: RefundFormValues) => paymentService.refundPayment(id, values),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: paymentKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: paymentKeys.lists() });

      const previousPayment = queryClient.getQueryData<Payment>(paymentKeys.detail(id));
      if (previousPayment) {
        queryClient.setQueryData(paymentKeys.detail(id), {
          ...previousPayment,
          status: 'REFUNDED',
        });
      }

      const queryCache = queryClient.getQueryCache().getAll();
      const previousListsData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'payment' && entry.queryKey[1] === 'list') {
          previousListsData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);
          const oldData = queryClient.getQueryData<PaymentListResponse>(entry.queryKey);
          if (oldData && Array.isArray(oldData.data)) {
            queryClient.setQueryData(entry.queryKey, {
              ...oldData,
              data: oldData.data.map((p) =>
                p.id === id ? { ...p, status: 'REFUNDED' } : p
              ),
            });
          }
        }
      });

      return { previousPayment, previousListsData };
    },
    onError: (err, values, context) => {
      if (context?.previousPayment) {
        queryClient.setQueryData(paymentKeys.detail(id), context.previousPayment);
      }
      if (context?.previousListsData) {
        context.previousListsData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}

export function usePaymentAllocations(id: string) {
  return useQuery({
    queryKey: paymentKeys.allocations(id),
    queryFn: () => paymentService.getPaymentAllocations(id),
    enabled: !!id,
  });
}

export function useApprovePayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => paymentService.approvePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}
