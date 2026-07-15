import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpsertChargeSplitRule } from '../hooks/use-revenue-splits';
import { useToast } from '@/components/ui/toast';
import type { SplitChargeType } from '../types/revenue-splits';

const ALLOWED_CHARGE_TYPES = ['SECURITY_DEPOSIT', 'UTILITY', 'MISC'] as const;

const schema = z.object({
  chargeType: z.enum(ALLOWED_CHARGE_TYPES),
  landlordSharePercentage: z.coerce
    .number()
    .min(0, 'Percentage cannot be less than 0')
    .max(100, 'Percentage cannot exceed 100'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  leaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultChargeType?: SplitChargeType;
  defaultPercentage?: number;
}

export function UpsertChargeSplitRuleDialog({ leaseId, open, onOpenChange, defaultChargeType, defaultPercentage }: Props) {
  const { addToast } = useToast();
  const mutation = useUpsertChargeSplitRule(leaseId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      chargeType: defaultChargeType ?? 'UTILITY',
      landlordSharePercentage: defaultPercentage ?? 100,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        chargeType: defaultChargeType ?? 'UTILITY',
        landlordSharePercentage: defaultPercentage ?? 100,
      });
    }
  }, [open, defaultChargeType, defaultPercentage, reset]);

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data, {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Charge split rule saved' });
        onOpenChange(false);
      },
      onError: (error: any) => {
        addToast({ variant: 'error', title: 'Save failed', description: error.message });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultChargeType ? 'Edit' : 'Add'} Charge Split Rule</DialogTitle>
          <DialogDescription>
            Set a specific revenue split for non-rent charges. RENT always uses the base split, and LATE_FEE is always 100% landlord.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Charge Type</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('chargeType')}
              disabled={!!defaultChargeType}
            >
              {ALLOWED_CHARGE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.chargeType && (
              <p className="text-sm text-destructive">{errors.chargeType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Landlord Share Percentage (%)</label>
            <Input type="number" step="1" {...register('landlordSharePercentage')} />
            {errors.landlordSharePercentage && (
              <p className="text-sm text-destructive">{errors.landlordSharePercentage.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
