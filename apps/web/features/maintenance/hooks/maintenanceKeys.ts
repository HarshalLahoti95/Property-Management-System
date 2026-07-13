export const maintenanceKeys = {
  all: ['maintenance'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...maintenanceKeys.lists(), filters] as const,
  details: () => [...maintenanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceKeys.details(), id] as const,
  histories: () => [...maintenanceKeys.all, 'history'] as const,
  history: (id: string) => [...maintenanceKeys.histories(), id] as const,
};
