'use client';
import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentFormSchema, PaymentFormValues } from '../schemas';
import { useLedgersByLease } from '@/features/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lease } from '@/features/lease/types';

export function PaymentForm({
  leases = [],
  onSubmit,
  submitting = false,
}: {
  leases: Lease[];
  onSubmit: (values: { leaseId: string; amount: number; method: string; reference?: string; tenantId?: string }) => void;
  submitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      leaseId: '',
      amount: 0.01,
      paymentMethod: 'ACH',
      transactionReference: '',
      paymentDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedLeaseId = useWatch({ control, name: 'leaseId' });
  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });

  // Auto-populate rent amount and tenant when lease changes
  React.useEffect(() => {
    if (selectedLeaseId) {
      const leaseObj = leases.find((l) => l.id === selectedLeaseId);
      if (leaseObj) {
        setValue('amount', Number(leaseObj.monthlyRent));
        const activeTenants = leaseObj.leaseTenants?.filter((lt) => lt.status === 'ACTIVE' || lt.status === 'PENDING') || [];
        if (activeTenants.length === 1) {
          setValue('tenantId', activeTenants[0].tenantId);
        } else {
          setValue('tenantId', '');
        }
      }
    } else {
      setValue('tenantId', '');
    }
  }, [selectedLeaseId, leases, setValue]);

  const activeTenantsForLease = React.useMemo(() => {
    if (!selectedLeaseId) return [];
    const leaseObj = leases.find((l) => l.id === selectedLeaseId);
    return leaseObj?.leaseTenants?.filter((lt) => lt.status === 'ACTIVE' || lt.status === 'PENDING') || [];
  }, [selectedLeaseId, leases]);

  const onFormSubmit = (values: PaymentFormValues) => {
    onSubmit({
      leaseId: values.leaseId,
      amount: values.amount,
      method: values.paymentMethod,
      reference: values.transactionReference,
      tenantId: values.tenantId,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 max-w-md bg-card p-6 border border-border rounded-lg shadow-sm">
      <div className="space-y-1">
        <label htmlFor="payment-leaseId" className="text-sm font-semibold text-foreground">
          Select Lease Agreement
        </label>
        <select
          id="payment-leaseId"
          {...register('leaseId')}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          aria-invalid={!!errors.leaseId}
          aria-describedby={errors.leaseId ? 'payment-leaseId-error' : undefined}
        >
          <option value="">Select Lease...</option>
          {leases.map((l) => {
            const label = l.unit?.property?.name
              ? `${l.unit.property.name} - Unit ${l.unit.unitNumber}`
              : l.id;
            return (
              <option key={l.id} value={l.id}>
                {label}
              </option>
            );
          })}
        </select>
        {errors.leaseId && (
          <p id="payment-leaseId-error" className="text-xs font-semibold text-destructive">
            {errors.leaseId.message}
          </p>
        )}
      </div>

      {selectedLeaseId && activeTenantsForLease.length > 0 && (
        <div className="space-y-1">
          <label htmlFor="payment-tenantId" className="text-sm font-semibold text-foreground">
            Paying Tenant {activeTenantsForLease.length === 1 && '(Auto-selected)'}
          </label>
          <select
            id="payment-tenantId"
            {...register('tenantId')}
            className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            aria-invalid={!!errors.tenantId}
            aria-describedby={errors.tenantId ? 'payment-tenantId-error' : undefined}
            disabled={activeTenantsForLease.length === 1}
          >
            <option value="">Select Tenant...</option>
            {activeTenantsForLease.map((lt) => (
              <option key={lt.tenantId} value={lt.tenantId}>
                {lt.tenant.fullName}
              </option>
            ))}
          </select>
          {errors.tenantId && (
            <p id="payment-tenantId-error" className="text-xs font-semibold text-destructive">
              {errors.tenantId.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="payment-amount" className="text-sm font-semibold text-foreground">
          Payment Amount (₹)
        </label>
        <Input
          id="payment-amount"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          aria-invalid={!!errors.amount}
          aria-describedby={errors.amount ? 'payment-amount-error' : undefined}
        />
        {errors.amount && (
          <p id="payment-amount-error" className="text-xs font-semibold text-destructive">
            {errors.amount.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="payment-method" className="text-sm font-semibold text-foreground">
          Payment Method
        </label>
        <select
          id="payment-method"
          {...register('paymentMethod')}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
          aria-invalid={!!errors.paymentMethod}
          aria-describedby={errors.paymentMethod ? 'payment-method-error' : undefined}
        >
          <option value="ACH">ACH Transfer</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="CASH">Cash Payment</option>
          <option value="CHECK">Check Payment</option>
        </select>
        {errors.paymentMethod && (
          <p id="payment-method-error" className="text-xs font-semibold text-destructive">
            {errors.paymentMethod.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="payment-reference" className="text-sm font-semibold text-foreground">
          Transaction Reference / Check # {selectedPaymentMethod === 'CASH' && '(Optional for Cash)'}
        </label>
        <Input
          id="payment-reference"
          type="text"
          placeholder="e.g. TXN-19374092"
          {...register('transactionReference')}
          aria-invalid={!!errors.transactionReference}
          aria-describedby={errors.transactionReference ? 'payment-reference-error' : undefined}
        />
        {errors.transactionReference && (
          <p id="payment-reference-error" className="text-xs font-semibold text-destructive">
            {errors.transactionReference.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="payment-date" className="text-sm font-semibold text-foreground">
          Payment Date
        </label>
        <Input
          id="payment-date"
          type="date"
          {...register('paymentDate')}
          aria-invalid={!!errors.paymentDate}
          aria-describedby={errors.paymentDate ? 'payment-date-error' : undefined}
        />
        {errors.paymentDate && (
          <p id="payment-date-error" className="text-xs font-semibold text-destructive">
            {errors.paymentDate.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full"
      >
        {submitting ? 'Submitting Payment...' : 'Submit Payment'}
      </Button>
    </form>
  );
}
