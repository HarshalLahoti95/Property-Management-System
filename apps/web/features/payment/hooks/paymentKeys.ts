export const paymentKeys = {
  all: ['payment'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  allocations: (id: string) => [...paymentKeys.all, 'allocations', id] as const,
};
