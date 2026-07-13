import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyService } from '../services/property.service';
import { Property, PropertyQueryFilters } from '../types';
import { PropertyFormValues } from '../schemas';
import { apiClient } from '@/lib/api-client';

export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: PropertyQueryFilters) => [...propertyKeys.lists(), filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  byLandlord: () => [...propertyKeys.all, 'byLandlord'] as const,
};

export function useProperties(filters: PropertyQueryFilters = {}) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => propertyService.getProperties(filters),
  });
}

export function usePropertiesByLandlord() {
  return useQuery({
    queryKey: propertyKeys.byLandlord(),
    queryFn: () => propertyService.getPropertiesByLandlord(),
  });
}

export function useLandlords() {
  return useQuery({
    queryKey: ['users', 'landlords'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/users', { params: { role: 'LANDLORD' } });
      return data;
    },
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => propertyService.getProperty(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PropertyFormValues) => propertyService.createProperty(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<PropertyFormValues> }) => propertyService.updateProperty(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertyService.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useApprovePropertyDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertyService.approveDeletion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useRejectPropertyDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertyService.rejectDeletion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useApproveUnitDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertyService.approveUnitDeletion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useRejectUnitDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertyService.rejectUnitDeletion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}
