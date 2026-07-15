import { apiClient } from '@/lib/api-client';
import { 
  LeaseDisbursementSummary, 
  CreateManualDisbursementPayload, 
  DisbursementCreatedResponse 
} from '../types';

export const disbursementService = {
  /**
   * Fetch the disbursement summary and history for a specific lease.
   * This includes the current amount owed to the landlord and the available trust ledger balance.
   */
  async getLeaseDisbursementSummary(leaseId: string): Promise<LeaseDisbursementSummary> {
    const { data } = await apiClient.get<LeaseDisbursementSummary>(`/disbursements/lease/${leaseId}`);
    return data;
  },

  /**
   * Create a manual disbursement payout for a lease.
   * Only PMC Staff (ADMIN) can perform this action.
   */
  async createManualDisbursement(payload: CreateManualDisbursementPayload): Promise<DisbursementCreatedResponse> {
    const { data } = await apiClient.post<DisbursementCreatedResponse>('/disbursements', payload);
    return data;
  }
};
