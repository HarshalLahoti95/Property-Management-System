import { apiClient } from '@/lib/api-client';
import { WorkOrder, WorkOrderComment, WorkOrderStatusHistory } from '../types';
import {
  WorkOrderFormValues,
  AssignVendorFormValues,
  TransitionStatusFormValues,
  CommentFormValues,
} from '../schemas';

export const maintenanceService = {
  async getWorkOrders(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<{
      data: WorkOrder[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/maintenance/work-orders', { params });
    return data;
  },

  async getWorkOrder(id: string) {
    const { data } = await apiClient.get<WorkOrder>(`/maintenance/work-orders/${id}`);
    return (data as any)?.data || data;
  },

  async createWorkOrder(values: WorkOrderFormValues) {
    const formattedValues = {
      ...values,
      estimatedCost: values.estimatedCost ? Number(values.estimatedCost) : null,
      targetCompletionDate: values.targetCompletionDate || null,
      propertyId: values.propertyId || null,
      unitId: values.unitId || null,
    };
    const { data } = await apiClient.post<WorkOrder>('/maintenance/work-orders', formattedValues);
    return data;
  },

  async updateWorkOrder(id: string, values: WorkOrderFormValues) {
    const formattedValues = {
      ...values,
      estimatedCost: values.estimatedCost ? Number(values.estimatedCost) : null,
      targetCompletionDate: values.targetCompletionDate || null,
      propertyId: values.propertyId || null,
      unitId: values.unitId || null,
    };
    const { data } = await apiClient.patch<WorkOrder>(`/maintenance/work-orders/${id}`, formattedValues);
    return data;
  },

  async transitionStatus(id: string, values: TransitionStatusFormValues) {
    const { data } = await apiClient.post<WorkOrder>(
      `/maintenance/work-orders/${id}/status`,
      values
    );
    return data;
  },

  async assignVendor(id: string, values: AssignVendorFormValues) {
    const { data } = await apiClient.post<WorkOrder>(
      `/maintenance/work-orders/${id}/assign-vendor`,
      values
    );
    return data;
  },

  async createComment(id: string, values: CommentFormValues) {
    const { data } = await apiClient.post<WorkOrderComment>(
      `/maintenance/work-orders/${id}/comments`,
      values
    );
    return data;
  },

  async getWorkOrderHistory(id: string) {
    const { data } = await apiClient.get<WorkOrderStatusHistory[]>(
      `/maintenance/work-orders/${id}/history`
    );
    return data;
  },
};
