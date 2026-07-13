import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function VoidChargeDialog({
  open,
  onOpenChange,
  onConfirm,
  submitting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  submitting?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Outstanding Charge</DialogTitle>
          <DialogDescription>
            Are you sure you want to void this charge? This action is permanent and will subtract the charge amount from the active ledger balance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Voiding Charge...' : 'Void Charge'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
