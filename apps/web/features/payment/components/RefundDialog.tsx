'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { refundFormSchema, RefundFormValues } from '../schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RefundDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  maxAmount = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RefundFormValues) => void;
  submitting?: boolean;
  maxAmount?: number;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      amount: undefined,
      reason: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      setValue('amount', maxAmount);
    }
  }, [open, maxAmount, setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Payment Refund</DialogTitle>
          <DialogDescription>
            Submit a full or partial refund for this payment transaction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label htmlFor="refund-amount" className="text-sm font-semibold text-foreground">
              Refund Amount (₹)
            </label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              max={maxAmount}
              placeholder="Leave empty for full refund"
              {...register('amount', { valueAsNumber: true })}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'refund-amount-error' : undefined}
            />
            {errors.amount && (
              <p id="refund-amount-error" className="text-xs font-semibold text-destructive">
                {errors.amount.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum refundable amount: ₹{maxAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="refund-reason" className="text-sm font-semibold text-foreground">
              Reason for Refund
            </label>
            <textarea
              id="refund-reason"
              {...register('reason')}
              className="w-full min-h-[80px] rounded-md border border-input bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              aria-invalid={!!errors.reason}
              aria-describedby={errors.reason ? 'refund-reason-error' : undefined}
              placeholder="e.g. Overpayment credit or security deposit return"
            />
            {errors.reason && (
              <p id="refund-reason-error" className="text-xs font-semibold text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} variant="destructive">
              {submitting ? 'Processing Refund...' : 'Issue Refund'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
