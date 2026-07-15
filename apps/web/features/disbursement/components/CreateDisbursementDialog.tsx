'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDisbursementFormSchema, DisbursementFormValues } from '../schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateDisbursementDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  currentAmountOwed = 0,
  trustLedgerBalance = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DisbursementFormValues) => void;
  submitting?: boolean;
  currentAmountOwed?: number;
  trustLedgerBalance?: number;
}) {
  const maxAvailable = trustLedgerBalance;
  const suggestedAmount = Math.min(currentAmountOwed, trustLedgerBalance);
  const isPartial = trustLedgerBalance < currentAmountOwed;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DisbursementFormValues>({
    resolver: zodResolver(getDisbursementFormSchema(maxAvailable)),
    defaultValues: {
      amount: 0,
      referenceNote: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        amount: suggestedAmount,
        referenceNote: '',
      });
    }
  }, [open, suggestedAmount, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Manual Disbursement</DialogTitle>
          <DialogDescription>
            Record a manual payout to the landlord from the property's trust account.
          </DialogDescription>
        </DialogHeader>

        {isPartial && (
          <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-md text-sm mb-4">
            <strong>Warning:</strong> Trust balance (₹{trustLedgerBalance.toFixed(2)}) is lower than the amount owed (₹{currentAmountOwed.toFixed(2)}) — this disbursement will be a partial payout.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2" noValidate>
          <div className="space-y-1">
            <label htmlFor="disbursement-amount" className="text-sm font-semibold text-foreground">
              Disbursement Amount (₹)
            </label>
            <Input
              id="disbursement-amount"
              type="number"
              step="0.01"
              max={maxAvailable}
              {...register('amount', { valueAsNumber: true })}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'disbursement-amount-error' : undefined}
            />
            {errors.amount && (
              <p id="disbursement-amount-error" className="text-xs font-semibold text-destructive">
                {errors.amount.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum available trust funds: ₹{maxAvailable.toFixed(2)}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="disbursement-reference" className="text-sm font-semibold text-foreground">
              Reference Note (Optional)
            </label>
            <textarea
              id="disbursement-reference"
              {...register('referenceNote')}
              className="w-full min-h-[80px] rounded-md border border-input bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              placeholder="e.g. Check #1234 or Transfer Notes"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || maxAvailable <= 0}>
              {submitting ? 'Processing...' : 'Submit Disbursement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
