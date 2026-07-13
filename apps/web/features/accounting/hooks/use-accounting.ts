import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService } from '../services/accounting.service';
import { accountingKeys } from './accountingKeys';
import { ChargeFormValues, AdjustFormValues } from '../schemas';
import { RentCharge, LeaseSummary } from '../types';

export function useLeaseSummary(leaseId: string) {
  return useQuery({
    queryKey: accountingKeys.summary(leaseId),
    queryFn: () => accountingService.getLeaseSummary(leaseId),
    enabled: !!leaseId,
  });
}

export function useLedgersByLease(leaseId: string) {
  return useQuery({
    queryKey: accountingKeys.ledger(leaseId),
    queryFn: () => accountingService.getLedgers(leaseId),
    enabled: !!leaseId,
  });
}

export function useLedgerHistory(ledgerId: string, page = 1, limit = 10) {
  const filters = { page, limit };
  return useQuery({
    queryKey: accountingKeys.history(ledgerId, filters),
    queryFn: () => accountingService.getLedgerHistory(ledgerId, filters),
    enabled: !!ledgerId,
  });
}

export function useCharges(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: accountingKeys.charges(filters),
    queryFn: () => accountingService.getCharges(filters),
  });
}

export function useCreateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ChargeFormValues) => accountingService.createCharge(values),
    onSuccess: () => {
      // Invalidate both lists and summaries
      queryClient.invalidateQueries({ queryKey: accountingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountingKeys.summaries() });
    },
  });
}

interface ChargeListResponse {
  data: RentCharge[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useVoidCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountingService.voidCharge(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: accountingKeys.lists() });
      await queryClient.cancelQueries({ queryKey: accountingKeys.summaries() });

      // Take a snapshot of the list query cache entries
      const queryCache = queryClient.getQueryCache().getAll();
      const previousQueriesData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'accounting') {
          previousQueriesData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);
          
          // Optimistically update charge list matches
          if (entry.queryKey[1] === 'list') {
            const oldData = queryClient.getQueryData<ChargeListResponse>(entry.queryKey);
            if (oldData && Array.isArray(oldData.data)) {
              queryClient.setQueryData(entry.queryKey, {
                ...oldData,
                data: oldData.data.map((c) =>
                  c.id === id ? { ...c, status: 'VOIDED' as const } : c
                ),
              });
            }
          }
        }
      });

      return { previousQueriesData };
    },
    onError: (err, id, context) => {
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountingKeys.summaries() });
    },
  });
}

export function useAdjustCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: AdjustFormValues }) =>
      accountingService.adjustCharge(id, values),
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey: accountingKeys.lists() });
      await queryClient.cancelQueries({ queryKey: accountingKeys.summaries() });

      const queryCache = queryClient.getQueryCache().getAll();
      const previousQueriesData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'accounting') {
          previousQueriesData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);

          // Optimistically adjust the ledger runningBalance / paidAmount / outstanding balances if in summary
          if (entry.queryKey[1] === 'summary') {
            const oldSummary = queryClient.getQueryData<LeaseSummary>(entry.queryKey);
            if (oldSummary) {
              queryClient.setQueryData(entry.queryKey, {
                ...oldSummary,
                operatingBalance: Math.max(0, oldSummary.operatingBalance - values.amount),
              });
            }
          }

          if (entry.queryKey[1] === 'list') {
            const oldData = queryClient.getQueryData<ChargeListResponse>(entry.queryKey);
            if (oldData && Array.isArray(oldData.data)) {
              queryClient.setQueryData(entry.queryKey, {
                ...oldData,
                data: oldData.data.map((c) => {
                  if (c.id === id) {
                    const nextPaid = Number(c.paidAmount) + values.amount;
                    const isFullyPaid = nextPaid >= Number(c.amount);
                    return {
                      ...c,
                      paidAmount: nextPaid,
                      status: isFullyPaid ? ('PAID' as const) : ('PARTIALLY_PAID' as const),
                    };
                  }
                  return c;
                }),
              });
            }
          }
        }
      });

      return { previousQueriesData };
    },
    onError: (err, params, context) => {
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountingKeys.summaries() });
    },
  });
}
