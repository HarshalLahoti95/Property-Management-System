'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { assignVendorSchema, AssignVendorFormValues } from '../schemas';
import { MOCK_VENDORS } from '../constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface VendorAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AssignVendorFormValues) => void;
  submitting?: boolean;
  currentVendorId?: string | null;
}

export function VendorAssignmentDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
  currentVendorId,
}: VendorAssignmentDialogProps) {
  const [useCustomId, setUseCustomId] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AssignVendorFormValues>({
    resolver: zodResolver(assignVendorSchema),
    defaultValues: {
      vendorId: currentVendorId || '',
    },
  });

  React.useEffect(() => {
    if (open && currentVendorId) {
      const isMock = MOCK_VENDORS.some((v) => v.id === currentVendorId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUseCustomId(!isMock);
      setValue('vendorId', currentVendorId);
    }
  }, [open, currentVendorId, setValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Maintenance Vendor</DialogTitle>
          <DialogDescription>
            Select a certified service contractor to dispatch for this maintenance repair.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Toggle standard selection vs custom UUID input */}
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase">
            <span>Vendor Selection Method</span>
            <button
              type="button"
              onClick={() => {
                setUseCustomId(!useCustomId);
                setValue('vendorId', '');
              }}
              className="text-primary hover:underline cursor-pointer"
            >
              {useCustomId ? 'Choose standard vendor' : 'Enter custom UUID'}
            </button>
          </div>

          {!useCustomId ? (
            <div className="space-y-1">
              <label htmlFor="vendor-select" className="text-sm font-semibold text-foreground">
                Select Contractor
              </label>
              <select
                id="vendor-select"
                {...register('vendorId')}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="">Select Contractor...</option>
                {MOCK_VENDORS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.specialty})
                  </option>
                ))}
              </select>
              {errors.vendorId && (
                <p className="text-xs font-semibold text-destructive">{errors.vendorId.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="vendor-uuid" className="text-sm font-semibold text-foreground">
                Custom Vendor UUID
              </label>
              <Input
                id="vendor-uuid"
                placeholder="e.g. d3b07384-d113-4f8e-a5f1-391490234567"
                {...register('vendorId')}
                aria-invalid={!!errors.vendorId}
              />
              {errors.vendorId && (
                <p className="text-xs font-semibold text-destructive">{errors.vendorId.message}</p>
              )}
            </div>
          )}

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
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Assigning...' : 'Assign Contractor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
