export interface BasePercentage {
  id: string;
  landlordSharePercentage: number;
  effectiveFrom: string;
}

export type SplitChargeType = 'SECURITY_DEPOSIT' | 'UTILITY' | 'MISC';

export interface ChargeSplitRule {
  id: string;
  chargeType: SplitChargeType;
  landlordSharePercentage: number;
}

export interface RevenueSplitsResponse {
  currentBasePercentage: BasePercentage | null;
  chargeSplitRules: ChargeSplitRule[];
}
