'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adjustFormSchema, AdjustFormValues } from '../schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ChargeAdjustmentDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  maxAmount = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdjustFormValues) => void;
  submitting?: boolean;
  maxAmount?: number;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustFormSchema),
    defaultValues: {
      amount: 0.01,
      description: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      setValue('amount', Number(maxAmount.toFixed(2)));
    }
  }, [open, maxAmount, setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Charge Credit Adjustment</DialogTitle>
          <DialogDescription>
            Decrease the remaining balance on this charge by applying a credit correction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label htmlFor="adjust-amount" className="text-sm font-semibold text-foreground">
              Credit Amount ($)
            </label>
            <Input
              id="adjust-amount"
              type="number"
              step="0.01"
              max={maxAmount}
              {...register('amount', { valueAsNumber: true })}
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'adjust-amount-error' : undefined}
            />
            {errors.amount && (
              <p id="adjust-amount-error" className="text-xs font-semibold text-destructive">
                {errors.amount.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Max credit adjustment available: ${maxAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="adjust-description" className="text-sm font-semibold text-foreground">
              Adjustment Reason
            </label>
            <textarea
              id="adjust-description"
              {...register('description')}
              className="w-full min-h-[80px] rounded-md border border-input bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'adjust-description-error' : undefined}
              placeholder="e.g. Correction for incorrect utilities readings"
            />
            {errors.description && (
              <p id="adjust-description-error" className="text-xs font-semibold text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Applying Adjustment...' : 'Apply Credit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
