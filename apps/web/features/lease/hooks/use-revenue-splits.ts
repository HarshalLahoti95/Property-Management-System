import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaseRevenueSplits, updateBaseSplit, upsertChargeSplitRule } from '../services/revenue-splits.service';
import type { RevenueSplitsResponse } from '../types';

export const revenueSplitsKeys = {
  all: (leaseId: string) => ['lease-revenue-splits', leaseId] as const,
};

export function useLeaseRevenueSplits(leaseId: string) {
  return useQuery<RevenueSplitsResponse, Error>({
    queryKey: revenueSplitsKeys.all(leaseId),
    queryFn: () => getLeaseRevenueSplits(leaseId),
    enabled: !!leaseId,
  });
}

export function useUpdateBaseSplit(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { landlordSharePercentage: number }) => updateBaseSplit(leaseId, variables.landlordSharePercentage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revenueSplitsKeys.all(leaseId) });
    },
  });
}

export function useUpsertChargeSplitRule(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { chargeType: string; landlordSharePercentage: number }) => upsertChargeSplitRule(leaseId, variables.chargeType, variables.landlordSharePercentage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revenueSplitsKeys.all(leaseId) });
    },
  });
}
