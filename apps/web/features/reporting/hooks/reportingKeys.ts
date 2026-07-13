export const reportingKeys = {
  all: ['reporting'] as const,
  summary: () => [...reportingKeys.all, 'summary'] as const,
  occupancy: (filters?: Record<string, unknown>) => [...reportingKeys.all, 'occupancy', filters || {}] as const,
  financials: (filters?: Record<string, unknown>) => [...reportingKeys.all, 'financials', filters || {}] as const,
  maintenance: (filters?: Record<string, unknown>) => [...reportingKeys.all, 'maintenance', filters || {}] as const,
};
