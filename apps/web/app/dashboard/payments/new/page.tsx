'use client';
import * as React from 'react';
import { useLeases } from '@/features/lease';
import { useRecordPayment, PaymentForm } from '@/features/payment';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NewPaymentPage() {
  const router = useRouter();
  const { data: leases = [], isLoading: loadingLeases } = useLeases();
  const recordPaymentMutation = useRecordPayment();

  const handlePaymentSubmit = (values: { leaseId: string; amount: number; method: string; reference?: string; tenantId?: string }) => {
    recordPaymentMutation.mutate(values, {
      onSuccess: () => {
        router.push('/dashboard/payments');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Submit Payment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register a cleared rent payment or security deposit transaction to a lease ledger.
          </p>
        </div>
        <Link href="/dashboard/payments">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      {loadingLeases ? (
        <div className="h-40 w-full bg-secondary animate-pulse rounded-md" />
      ) : (
        <div className="flex justify-center md:justify-start">
          <PaymentForm
            leases={leases}
            onSubmit={handlePaymentSubmit}
            submitting={recordPaymentMutation.isPending}
          />
        </div>
      )}
    </div>
  );
}
