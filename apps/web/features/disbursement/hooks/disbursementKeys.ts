export const disbursementKeys = {
  all: ['disbursements'] as const,
  summaries: () => [...disbursementKeys.all, 'summary'] as const,
  summary: (leaseId: string) => [...disbursementKeys.summaries(), leaseId] as const,
};
