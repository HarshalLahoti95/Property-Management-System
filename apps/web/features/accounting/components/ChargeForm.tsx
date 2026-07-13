'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { chargeFormSchema, ChargeFormValues } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lease } from '@/features/lease/types';

export function ChargeForm({
  leases = [],
  onSubmit,
  submitting = false,
  defaultLeaseId,
}: {
  leases: Lease[];
  onSubmit: (values: ChargeFormValues) => void;
  submitting?: boolean;
  defaultLeaseId?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeFormSchema),
    defaultValues: {
      leaseId: defaultLeaseId || '',
      type: 'RENT',
      amount: 0.01,
      dueDate: '',
      description: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md bg-card p-6 border border-border rounded-lg">
      <div className="space-y-1">
        <label htmlFor="leaseId" className="text-sm font-semibold text-foreground">
          Lease Agreement
        </label>
        <select
          id="leaseId"
          {...register('leaseId')}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          aria-invalid={!!errors.leaseId}
          aria-describedby={errors.leaseId ? 'leaseId-error' : undefined}
        >
          <option value="">Select Lease...</option>
          {leases.map((l) => {
            const labelName = l.unit?.property?.name
              ? `${l.unit.property.name} - Unit ${l.unit.unitNumber}`
              : l.id;
            return (
              <option key={l.id} value={l.id}>
                {labelName}
              </option>
            );
          })}
        </select>
        {errors.leaseId && (
          <p id="leaseId-error" className="text-xs font-semibold text-destructive">
            {errors.leaseId.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="type" className="text-sm font-semibold text-foreground">
          Charge Category
        </label>
        <select
          id="type"
          {...register('type')}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          aria-invalid={!!errors.type}
          aria-describedby={errors.type ? 'type-error' : undefined}
        >
          <option value="RENT">Rent</option>
          <option value="SECURITY_DEPOSIT">Security Deposit</option>
          <option value="LATE_FEE">Late Fee</option>
          <option value="UTILITY">Utility</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="MISC">Miscellaneous</option>
        </select>
        {errors.type && (
          <p id="type-error" className="text-xs font-semibold text-destructive">
            {errors.type.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="amount" className="text-sm font-semibold text-foreground">
          Amount ($)
        </label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          aria-invalid={!!errors.amount}
          aria-describedby={errors.amount ? 'amount-error' : undefined}
        />
        {errors.amount && (
          <p id="amount-error" className="text-xs font-semibold text-destructive">
            {errors.amount.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="dueDate" className="text-sm font-semibold text-foreground">
          Due Date
        </label>
        <Input
          id="dueDate"
          type="date"
          {...register('dueDate')}
          aria-invalid={!!errors.dueDate}
          aria-describedby={errors.dueDate ? 'dueDate-error' : undefined}
        />
        {errors.dueDate && (
          <p id="dueDate-error" className="text-xs font-semibold text-destructive">
            {errors.dueDate.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-semibold text-foreground">
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          className="w-full min-h-[80px] rounded-md border border-input bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-xs font-semibold text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Creating Charge...' : 'Create Charge'}
      </Button>
    </form>
  );
}
