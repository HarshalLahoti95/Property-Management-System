import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disbursementService } from '../services/disbursement.service';
import { disbursementKeys } from './disbursementKeys';
import { 
  CreateManualDisbursementPayload, 
  LeaseDisbursementSummary, 
  DisbursementHistoryItem 
} from '../types';

export function useLeaseDisbursementSummary(leaseId: string) {
  return useQuery({
    queryKey: disbursementKeys.summary(leaseId),
    queryFn: () => disbursementService.getLeaseDisbursementSummary(leaseId),
    enabled: !!leaseId,
  });
}

export function useCreateDisbursement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (values: CreateManualDisbursementPayload) => disbursementService.createManualDisbursement(values),
    onMutate: async (newDisbursement) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: disbursementKeys.summary(newDisbursement.leaseId) });

      // Snapshot the previous value
      const previousSummary = queryClient.getQueryData<LeaseDisbursementSummary>(
        disbursementKeys.summary(newDisbursement.leaseId)
      );

      if (previousSummary) {
        // Optimistically update to the new value
        const optimisticHistoryItem: DisbursementHistoryItem = {
          id: 'temp-id-' + Date.now(),
          amount: newDisbursement.amount.toString(),
          status: 'PAID', 
          method: 'MANUAL',
          reference: newDisbursement.referenceNote || null,
          recordedByUserId: 'optimistic', 
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const currentOwed = parseFloat(previousSummary.currentAmountOwed) || 0;
        const trustBalance = parseFloat(previousSummary.trustLedgerBalance) || 0;

        queryClient.setQueryData<LeaseDisbursementSummary>(disbursementKeys.summary(newDisbursement.leaseId), {
          ...previousSummary,
          currentAmountOwed: Math.max(0, currentOwed - newDisbursement.amount).toString(),
          trustLedgerBalance: Math.max(0, trustBalance - newDisbursement.amount).toString(),
          disbursements: [optimisticHistoryItem, ...previousSummary.disbursements],
        });
      }

      // Return a context with the previous data
      return { previousSummary };
    },
    onError: (err, newDisbursement, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousSummary) {
        queryClient.setQueryData(
          disbursementKeys.summary(newDisbursement.leaseId), 
          context.previousSummary
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure we have the real server state
      queryClient.invalidateQueries({ queryKey: disbursementKeys.summary(variables.leaseId) });
    },
  });
}
