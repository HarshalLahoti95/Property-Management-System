'use client';
import * as React from 'react';
import { RentCharge } from '../types';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChargeStatusBadge } from './ChargeStatusBadge';
import { Button } from '@/components/ui/button';
import { VoidChargeDialog } from './VoidChargeDialog';
import { ChargeAdjustmentDialog } from './ChargeAdjustmentDialog';
import { useVoidCharge, useAdjustCharge } from '../hooks/use-accounting';

export function ChargeDetailsDialog({
  charge,
  open,
  onOpenChange,
}: {
  charge: RentCharge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const voidMutation = useVoidCharge();
  const adjustMutation = useAdjustCharge();

  const [voidOpen, setVoidOpen] = React.useState(false);
  const [adjustOpen, setAdjustOpen] = React.useState(false);

  if (!charge) return null;

  const isLandlordOrAdmin = user?.role === 'ADMIN' || user?.role === 'LANDLORD';
  const outstandingAmount = Number(charge.amount) - Number(charge.paidAmount);
  const isUnpaid = charge.status === 'UNPAID';
  const isAdjustable = charge.status === 'UNPAID' || charge.status === 'PARTIALLY_PAID';

  const handleVoid = () => {
    voidMutation.mutate(charge.id, {
      onSuccess: () => {
        setVoidOpen(false);
        onOpenChange(false);
      },
    });
  };

  const handleAdjust = (values: { amount: number; description: string }) => {
    adjustMutation.mutate(
      { id: charge.id, values },
      {
        onSuccess: () => {
          setAdjustOpen(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Charge Audit Details</DialogTitle>
            <DialogDescription>
              Detailed view of selected ledger ledger entry charge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Category</p>
                <p className="text-sm font-medium capitalize mt-1">
                  {charge.type.replace('_', ' ').toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                <div className="mt-1">
                  <ChargeStatusBadge status={charge.status} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Description</p>
              <p className="text-sm text-foreground">{charge.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 border border-border p-3 rounded-lg bg-muted/40">
              <div className="text-center border-r border-border">
                <p className="text-xs text-muted-foreground font-semibold">Total Amount</p>
                <p className="text-sm font-bold mt-1">${Number(charge.amount).toFixed(2)}</p>
              </div>
              <div className="text-center border-r border-border">
                <p className="text-xs text-muted-foreground font-semibold">Paid Amount</p>
                <p className="text-sm font-bold text-emerald-600 mt-1">${Number(charge.paidAmount).toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-semibold">Outstanding</p>
                <p className="text-sm font-bold text-destructive mt-1">${outstandingAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
              <div className="flex justify-between">
                <span>Due Date</span>
                <span className="font-medium text-foreground">{new Date(charge.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Created Date</span>
                <span className="font-medium text-foreground">{new Date(charge.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Charge ID</span>
                <span className="font-mono">{charge.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Ledger ID</span>
                <span className="font-mono truncate max-w-[150px]">{charge.ledgerId}</span>
              </div>
            </div>

            {isLandlordOrAdmin && isAdjustable && (
              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-2">
                {isUnpaid && (
                  <Button variant="destructive" size="sm" onClick={() => setVoidOpen(true)}>
                    Void Charge
                  </Button>
                )}
                <Button variant="default" size="sm" onClick={() => setAdjustOpen(true)}>
                  Apply Credit
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {voidOpen && (
        <VoidChargeDialog
          open={voidOpen}
          onOpenChange={setVoidOpen}
          onConfirm={handleVoid}
          submitting={voidMutation.isPending}
        />
      )}

      {adjustOpen && (
        <ChargeAdjustmentDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          onSubmit={handleAdjust}
          submitting={adjustMutation.isPending}
          maxAmount={outstandingAmount}
        />
      )}
    </>
  );
}
