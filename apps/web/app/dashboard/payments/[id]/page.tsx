'use client';
import * as React from 'react';
import { use } from 'react';
import { usePayment, usePaymentAllocations, PaymentCard, PaymentAllocationTable } from '@/features/payment';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const { data: payment, isLoading: loadingPayment } = usePayment(id);
  const { data: allocations = [], isLoading: loadingAllocations } = usePaymentAllocations(id);

  const isLoading = loadingPayment || loadingAllocations;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transaction Detail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Audit payment status, tenant records, and allocation breakdown mapping.
          </p>
        </div>
        <Link href="/dashboard/payments">
          <Button variant="outline">Back History</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4" data-testid="payment-detail-loading">
          <div className="h-40 bg-secondary animate-pulse rounded-lg" />
          <div className="h-40 bg-secondary animate-pulse rounded-lg" />
        </div>
      ) : payment ? (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <PaymentCard payment={payment} />
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h4 className="font-semibold text-lg text-foreground mb-4">Payment Allocation Mapping</h4>
              <PaymentAllocationTable allocations={allocations} loading={loadingAllocations} />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 border border-dashed border-border rounded-lg text-center bg-card">
          <p className="text-sm text-muted-foreground">Payment not found.</p>
        </div>
      )}
    </div>
  );
}
