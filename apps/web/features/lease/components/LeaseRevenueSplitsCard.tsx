import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useLeaseRevenueSplits } from '../hooks/use-revenue-splits';
import { UpdateBaseSplitDialog } from './UpdateBaseSplitDialog';
import { UpsertChargeSplitRuleDialog } from './UpsertChargeSplitRuleDialog';
import type { SplitChargeType } from '../types/revenue-splits';

interface Props {
  leaseId: string;
}

export function LeaseRevenueSplitsCard({ leaseId }: Props) {
  const { user } = useAuth();
  const { data: splits, isLoading, error } = useLeaseRevenueSplits(leaseId);
  
  const [baseDialogOpen, setBaseDialogOpen] = React.useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = React.useState(false);
  
  const [editingRuleType, setEditingRuleType] = React.useState<SplitChargeType | undefined>();
  const [editingRulePercentage, setEditingRulePercentage] = React.useState<number | undefined>();

  // Only ADMIN users can view/edit revenue splits
  if (user?.role !== 'ADMIN') {
    return null;
  }

  if (isLoading) {
    return <div className="h-32 w-full bg-secondary animate-pulse rounded-md" />;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-lg text-destructive">
        Failed to load revenue splits configuration.
      </div>
    );
  }

  const openAddRule = () => {
    setEditingRuleType(undefined);
    setEditingRulePercentage(undefined);
    setRuleDialogOpen(true);
  };

  const openEditRule = (chargeType: SplitChargeType, percentage: number) => {
    setEditingRuleType(chargeType);
    setEditingRulePercentage(percentage);
    setRuleDialogOpen(true);
  };

  return (
    <div className="bg-card border border-border p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Revenue Splits &amp; Rules</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how revenue is split between the landlord and the property management company.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Base Split Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-foreground">Base Rent Split</h3>
            <Button variant="outline" size="sm" onClick={() => setBaseDialogOpen(true)}>
              Update Base Split
            </Button>
          </div>
          <div className="bg-muted/30 p-4 rounded-md border border-border">
            {splits?.currentBasePercentage ? (
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {splits.currentBasePercentage.landlordSharePercentage}% Landlord
                </span>
                <span className="text-xs text-muted-foreground">
                  Effective since: {new Date(splits.currentBasePercentage.effectiveFrom).toLocaleDateString()}
                </span>
                <span className="text-xs text-muted-foreground mt-2">
                  Company keeps {100 - splits.currentBasePercentage.landlordSharePercentage}%
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No base split configured. Defaulting to 100%.</p>
            )}
          </div>
        </div>

        {/* Charge Split Rules Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold text-foreground">Specific Charge Rules</h3>
            <Button variant="outline" size="sm" onClick={openAddRule}>
              Add Rule
            </Button>
          </div>
          <div className="space-y-2">
            {splits?.chargeSplitRules && splits.chargeSplitRules.length > 0 ? (
              splits.chargeSplitRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-card">
                  <div>
                    <span className="font-semibold text-sm">{rule.chargeType.replace('_', ' ')}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rule.landlordSharePercentage}% Landlord / {100 - rule.landlordSharePercentage}% Company
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEditRule(rule.chargeType, rule.landlordSharePercentage)}>
                    Edit
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic p-3 border border-dashed border-border rounded-md">
                No specific rules. All applicable charges will use the base split. LATE_FEE is always 100% Landlord.
              </p>
            )}
          </div>
        </div>
      </div>

      <UpdateBaseSplitDialog
        leaseId={leaseId}
        currentPercentage={splits?.currentBasePercentage?.landlordSharePercentage}
        open={baseDialogOpen}
        onOpenChange={setBaseDialogOpen}
      />

      <UpsertChargeSplitRuleDialog
        leaseId={leaseId}
        defaultChargeType={editingRuleType}
        defaultPercentage={editingRulePercentage}
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
      />
    </div>
  );
}
