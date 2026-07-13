import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaseService } from '../services/lease.service';
import { Lease, LeaseStatus } from '../types';
import { LeaseFormValues } from '../schemas';

export const leaseKeys = {
  all: ['leases'] as const,
  lists: () => [...leaseKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...leaseKeys.lists(), filters] as const,
  details: () => [...leaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaseKeys.details(), id] as const,
};

export function useLeases(filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: leaseKeys.list(filters),
    queryFn: () => leaseService.getLeases(filters),
  });
}

export function useLease(id: string) {
  return useQuery({
    queryKey: leaseKeys.detail(id),
    queryFn: () => leaseService.getLease(id),
    enabled: !!id,
  });
}

export function useLeaseDocuments(id: string) {
  return useQuery({
    queryKey: [...leaseKeys.all, id, 'documents'],
    queryFn: () => leaseService.getLeaseDocuments(id),
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LeaseFormValues) => leaseService.createLease(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaseKeys.lists() });
    },
  });
}

export function useUpdateLease(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<LeaseFormValues>) => leaseService.updateLease(id, values),
    onMutate: async (newValues) => {
      await queryClient.cancelQueries({ queryKey: leaseKeys.detail(id) });
      const previousLease = queryClient.getQueryData<Lease>(leaseKeys.detail(id));
      if (previousLease) {
        queryClient.setQueryData<Lease>(leaseKeys.detail(id), {
          ...previousLease,
          ...newValues,
        } as any);
      }
      return { previousLease };
    },
    onError: (err, newValues, context) => {
      if (context?.previousLease) {
        queryClient.setQueryData(leaseKeys.detail(id), context.previousLease);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...leaseKeys.all, id, 'documents'] });
    },
  });
}

export function useDeleteLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaseService.deleteLease(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaseKeys.lists() });
    },
  });
}

export function useTransitionLeaseStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { status: LeaseStatus; reasonDescription?: string }) =>
      leaseService.transitionStatus(id, params.status, params.reasonDescription),
    // No optimistic update: the server may return a different status than
    // what was requested (e.g. partial multi-tenant sign stays
    // PENDING_TENANT_SIGNATURE). Relying on onSettled's invalidateQueries
    // to refetch authoritative state avoids a flicker-and-revert cycle.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...leaseKeys.all, id, 'documents'] });
    },
  });
}
