export const accountingKeys = {
  all: ['accounting'] as const,
  lists: () => [...accountingKeys.all, 'list'] as const,
  charges: (filters: Record<string, unknown>) => [...accountingKeys.lists(), 'charges', filters] as const,
  summaries: () => [...accountingKeys.all, 'summary'] as const,
  summary: (leaseId: string) => [...accountingKeys.summaries(), leaseId] as const,
  ledgers: () => [...accountingKeys.all, 'ledger'] as const,
  ledger: (leaseId: string) => [...accountingKeys.ledgers(), leaseId] as const,
  histories: () => [...accountingKeys.all, 'history'] as const,
  history: (ledgerId: string, filters: Record<string, unknown>) => [...accountingKeys.histories(), ledgerId, filters] as const,
};
