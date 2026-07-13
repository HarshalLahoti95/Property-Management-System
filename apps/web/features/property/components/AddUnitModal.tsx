'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLandlords } from '../hooks/use-properties';

const createUnitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  floor: z.number().int().min(0, 'Floor must be 0 or greater'),
  bedrooms: z.number().int().min(0, 'Bedrooms must be 0 or greater'),
  bathrooms: z.number().int().min(0, 'Bathrooms must be 0 or greater'),
  squareFootage: z.number().int().min(1, 'Square footage must be greater than 0'),
  defaultRent: z.number().min(0, 'Rent cannot be negative'),
  landlordId: z.string().optional(),
});

type CreateUnitValues = z.infer<typeof createUnitSchema>;

export function AddUnitModal({
  propertyId,
  isOpen,
  onClose,
}: {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: landlords } = useLandlords();
  const isAdmin = user?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUnitValues>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      unitNumber: '',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: 500,
      defaultRent: 0,
      landlordId: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateUnitValues) =>
      apiClient.post(`/properties/${propertyId}/units`, { ...values, status: 'VACANT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      reset();
      onClose();
    },
  });

  const onSubmit = (data: CreateUnitValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Unit to Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Unit Number</label>
            <Input {...register('unitNumber')} placeholder="e.g. 101" />
            {errors.unitNumber && <p className="text-xs text-destructive">{errors.unitNumber.message}</p>}
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-semibold">Landlord Owner</label>
              <select 
                {...register('landlordId', { required: 'Landlord is required when created by an Admin' })}
                className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a Landlord...</option>
                {landlords?.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.fullName} ({l.email})</option>
                ))}
              </select>
              {errors.landlordId && <p className="text-xs text-destructive">{errors.landlordId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Target Rent (₹)</label>
              <Input type="number" step="0.01" {...register('defaultRent', { valueAsNumber: true })} />
              {errors.defaultRent && <p className="text-xs text-destructive">{errors.defaultRent.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Floor Level</label>
              <Input type="number" {...register('floor', { valueAsNumber: true })} />
              {errors.floor && <p className="text-xs text-destructive">{errors.floor.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Bedrooms</label>
              <Input type="number" {...register('bedrooms', { valueAsNumber: true })} />
              {errors.bedrooms && <p className="text-xs text-destructive">{errors.bedrooms.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Bathrooms</label>
              <Input type="number" {...register('bathrooms', { valueAsNumber: true })} />
              {errors.bathrooms && <p className="text-xs text-destructive">{errors.bathrooms.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Sq Ft</label>
              <Input type="number" {...register('squareFootage', { valueAsNumber: true })} />
              {errors.squareFootage && <p className="text-xs text-destructive">{errors.squareFootage.message}</p>}
            </div>
          </div>

          {mutation.isError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-xs font-medium text-destructive">
                {mutation.error.message}
              </p>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full">
            {isSubmitting || mutation.isPending ? 'Saving...' : 'Add Unit'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
