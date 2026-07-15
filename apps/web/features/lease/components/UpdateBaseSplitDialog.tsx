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
import { useUpdateBaseSplit } from '../hooks/use-revenue-splits';
import { useToast } from '@/components/ui/toast';

const schema = z.object({
  landlordSharePercentage: z.coerce
    .number()
    .min(0, 'Percentage cannot be less than 0')
    .max(100, 'Percentage cannot exceed 100'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  leaseId: string;
  currentPercentage?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateBaseSplitDialog({ leaseId, currentPercentage, open, onOpenChange }: Props) {
  const { addToast } = useToast();
  const mutation = useUpdateBaseSplit(leaseId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      landlordSharePercentage: currentPercentage ?? 100,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({ landlordSharePercentage: currentPercentage ?? 100 });
    }
  }, [open, currentPercentage, reset]);

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data, {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Base split updated' });
        onOpenChange(false);
      },
      onError: (error: any) => {
        addToast({ variant: 'error', title: 'Update failed', description: error.message });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Base Revenue Split</DialogTitle>
          <DialogDescription>
            This percentage applies to standard RENT payments going forward. 
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 my-4">
          <div className="space-y-2">
            <label htmlFor="landlordSharePercentage" className="text-sm font-medium">Landlord Share Percentage (%)</label>
            <Input id="landlordSharePercentage" type="number" step="1" {...register('landlordSharePercentage')} />
            {errors.landlordSharePercentage && (
              <p className="text-sm text-destructive">{errors.landlordSharePercentage.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Split'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
