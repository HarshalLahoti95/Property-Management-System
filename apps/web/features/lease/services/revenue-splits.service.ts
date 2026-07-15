import { apiClient } from '@/lib/api-client';
import type { RevenueSplitsResponse } from '../types';

export async function getLeaseRevenueSplits(leaseId: string): Promise<RevenueSplitsResponse> {
  const res = await apiClient.get(`/v1/accounting/leases/${leaseId}/revenue-splits`);
  return res.data;
}

export async function updateBaseSplit(leaseId: string, landlordSharePercentage: number) {
  const res = await apiClient.post(`/v1/accounting/leases/${leaseId}/share-percentages`, { landlordSharePercentage });
  return res.data;
}

export async function upsertChargeSplitRule(leaseId: string, chargeType: string, landlordSharePercentage: number) {
  const res = await apiClient.put(`/v1/accounting/leases/${leaseId}/charge-split-rules/${chargeType}`, { landlordSharePercentage });
  return res.data;
}
