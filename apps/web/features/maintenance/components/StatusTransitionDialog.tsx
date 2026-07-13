'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transitionStatusSchema, TransitionStatusFormValues } from '../schemas';
import { WorkOrderStatus } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TransitionStatusFormValues) => void;
  submitting?: boolean;
  currentStatus: WorkOrderStatus;
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  currentStatus,
}: StatusTransitionDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TransitionStatusFormValues>({
    resolver: zodResolver(transitionStatusSchema),
    defaultValues: {
      status: currentStatus,
      reasonDescription: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      setValue('status', currentStatus);
      setValue('reasonDescription', '');
    }
  }, [open, currentStatus, setValue]);

  // Allowed transitions depending on current state (per NestJS controller constraints)
  const allowedOptions = React.useMemo(() => {
    switch (currentStatus) {
      case 'SUBMITTED':
        return [
          { value: 'ASSIGNED', label: 'Assigned' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ];
      case 'ASSIGNED':
        return [
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ];
      case 'IN_PROGRESS':
        return [
          { value: 'ON_HOLD', label: 'On Hold' },
          { value: 'RESOLVED', label: 'Resolved (Completed)' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ];
      case 'ON_HOLD':
        return [
          { value: 'IN_PROGRESS', label: 'In Progress' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ];
      case 'RESOLVED':
        // Reopen work order - let's allow moving back to SUBMITTED if needed (tests mention reopened work orders)
        return [{ value: 'SUBMITTED', label: 'Reopen (Submitted)' }];
      case 'CANCELLED':
        return [{ value: 'SUBMITTED', label: 'Reopen (Submitted)' }];
      default:
        return [];
    }
  }, [currentStatus]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Work Order Status</DialogTitle>
          <DialogDescription>
            Change the lifecycle stage of this work order and document the transition rationale.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Status Selection */}
          <div className="space-y-1">
            <label htmlFor="transition-status" className="text-sm font-semibold text-foreground">
              New Status State
            </label>
            <select
              id="transition-status"
              {...register('status')}
              className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="">Select status...</option>
              {allowedOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="text-xs font-semibold text-destructive">{errors.status.message}</p>
            )}
          </div>

          {/* Reason / Comment */}
          <div className="space-y-1">
            <label htmlFor="transition-reason" className="text-sm font-semibold text-foreground">
              Transition Explanation / Comment
            </label>
            <textarea
              id="transition-reason"
              placeholder="e.g. Parts ordered from supplier; scheduling service technician."
              {...register('reasonDescription')}
              className="w-full min-h-[80px] rounded-md border border-input bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            />
            {errors.reasonDescription && (
              <p className="text-xs font-semibold text-destructive">
                {errors.reasonDescription.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || allowedOptions.length === 0}>
              {submitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
