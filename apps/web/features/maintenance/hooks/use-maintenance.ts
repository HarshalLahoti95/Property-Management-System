import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/maintenance.service';
import { maintenanceKeys } from './maintenanceKeys';
import {
  WorkOrderFormValues,
  AssignVendorFormValues,
  TransitionStatusFormValues,
  CommentFormValues,
} from '../schemas';
import { WorkOrder, WorkOrderComment } from '../types';

interface WorkOrdersResponse {
  data: WorkOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useWorkOrders(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: maintenanceKeys.list(filters),
    queryFn: () => maintenanceService.getWorkOrders(filters),
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: () => maintenanceService.getWorkOrder(id),
    enabled: !!id,
  });
}

export function useWorkOrderHistory(id: string) {
  return useQuery({
    queryKey: maintenanceKeys.history(id),
    queryFn: () => maintenanceService.getWorkOrderHistory(id),
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: WorkOrderFormValues) => maintenanceService.createWorkOrder(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
    },
  });
}

export function useUpdateWorkOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: WorkOrderFormValues) => maintenanceService.updateWorkOrder(id, values),
    onMutate: async (newValues) => {
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() });

      const previousDetail = queryClient.getQueryData<WorkOrder>(maintenanceKeys.detail(id));
      if (previousDetail) {
        queryClient.setQueryData<WorkOrder>(maintenanceKeys.detail(id), {
          ...previousDetail,
          title: newValues.title,
          description: newValues.description,
          priority: newValues.priority,
          estimatedCost: newValues.estimatedCost ? Number(newValues.estimatedCost) : null,
          targetCompletionDate: newValues.targetCompletionDate || null,
        });
      }

      const queryCache = queryClient.getQueryCache().getAll();
      const previousListsData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'maintenance' && entry.queryKey[1] === 'list') {
          previousListsData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);
          const oldData = queryClient.getQueryData<WorkOrdersResponse>(entry.queryKey);
          if (oldData && Array.isArray(oldData.data)) {
            queryClient.setQueryData(entry.queryKey, {
              ...oldData,
              data: oldData.data.map((w) =>
                w.id === id
                  ? {
                      ...w,
                      title: newValues.title,
                      description: newValues.description,
                      priority: newValues.priority,
                      estimatedCost: newValues.estimatedCost ? Number(newValues.estimatedCost) : null,
                      targetCompletionDate: newValues.targetCompletionDate || null,
                    }
                  : w
              ),
            });
          }
        }
      });

      return { previousDetail, previousListsData };
    },
    onError: (err, newValues, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(maintenanceKeys.detail(id), context.previousDetail);
      }
      if (context?.previousListsData) {
        context.previousListsData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
    },
  });
}

export function useTransitionWorkOrderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TransitionStatusFormValues) =>
      maintenanceService.transitionStatus(id, values),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() });

      const previousDetail = queryClient.getQueryData<WorkOrder>(maintenanceKeys.detail(id));
      if (previousDetail) {
        queryClient.setQueryData<WorkOrder>(maintenanceKeys.detail(id), {
          ...previousDetail,
          status: values.status,
        });
      }

      const queryCache = queryClient.getQueryCache().getAll();
      const previousListsData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'maintenance' && entry.queryKey[1] === 'list') {
          previousListsData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);
          const oldData = queryClient.getQueryData<WorkOrdersResponse>(entry.queryKey);
          if (oldData && Array.isArray(oldData.data)) {
            queryClient.setQueryData(entry.queryKey, {
              ...oldData,
              data: oldData.data.map((w) =>
                w.id === id ? { ...w, status: values.status } : w
              ),
            });
          }
        }
      });

      return { previousDetail, previousListsData };
    },
    onError: (err, values, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(maintenanceKeys.detail(id), context.previousDetail);
      }
      if (context?.previousListsData) {
        context.previousListsData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.history(id) });
    },
  });
}

export function useAssignWorkOrderVendor(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AssignVendorFormValues) => maintenanceService.assignVendor(id, values),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() });

      const previousDetail = queryClient.getQueryData<WorkOrder>(maintenanceKeys.detail(id));
      if (previousDetail) {
        queryClient.setQueryData<WorkOrder>(maintenanceKeys.detail(id), {
          ...previousDetail,
          vendorId: values.vendorId,
          // Optimistically show assigned, the detailed vendor payload is invalid until settled
          status: 'ASSIGNED',
        });
      }

      const queryCache = queryClient.getQueryCache().getAll();
      const previousListsData: Array<[readonly unknown[], unknown]> = [];

      queryCache.forEach((entry) => {
        if (entry.queryKey[0] === 'maintenance' && entry.queryKey[1] === 'list') {
          previousListsData.push([entry.queryKey, queryClient.getQueryData(entry.queryKey)]);
          const oldData = queryClient.getQueryData<WorkOrdersResponse>(entry.queryKey);
          if (oldData && Array.isArray(oldData.data)) {
            queryClient.setQueryData(entry.queryKey, {
              ...oldData,
              data: oldData.data.map((w) =>
                w.id === id ? { ...w, vendorId: values.vendorId, status: 'ASSIGNED' } : w
              ),
            });
          }
        }
      });

      return { previousDetail, previousListsData };
    },
    onError: (err, values, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(maintenanceKeys.detail(id), context.previousDetail);
      }
      if (context?.previousListsData) {
        context.previousListsData.forEach(([key, val]) => {
          queryClient.setQueryData(key, val);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.history(id) });
    },
  });
}

export function useCreateWorkOrderComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CommentFormValues) => maintenanceService.createComment(id, values),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.detail(id) });

      const previousDetail = queryClient.getQueryData<WorkOrder>(maintenanceKeys.detail(id));
      if (previousDetail) {
        const tempComment: WorkOrderComment = {
          id: 'temp-comment-' + Date.now(),
          workOrderId: id,
          authorId: 'temp-author',
          commentText: values.commentText,
          createdAt: new Date().toISOString(),
          author: {
            id: 'temp-author',
            fullName: 'Current User',
            email: '',
            role: 'USER',
          },
        };
        queryClient.setQueryData<WorkOrder>(maintenanceKeys.detail(id), {
          ...previousDetail,
          comments: [...(previousDetail.comments || []), tempComment],
        });
      }

      return { previousDetail };
    },
    onError: (err, values, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(maintenanceKeys.detail(id), context.previousDetail);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(id) });
    },
  });
}
