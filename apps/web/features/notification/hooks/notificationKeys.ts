export const notificationKeys = {
  all: ['notification'] as const,
  histories: () => [...notificationKeys.all, 'history'] as const,
  history: (filters: Record<string, unknown>) => [...notificationKeys.histories(), filters] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};
