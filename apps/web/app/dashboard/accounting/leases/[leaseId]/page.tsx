'use client';
import * as React from 'react';
import { use } from 'react';
import {
  useLeaseSummary,
  useLedgersByLease,
  LeaseFinancialSummary,
} from '@/features/accounting';
import { useLease } from '@/features/lease';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LeaseAccountingPage({
  params,
}: {
  params: Promise<{ leaseId: string }>;
}) {
  const resolvedParams = use(params);
  const leaseId = resolvedParams.leaseId;

  const { data: lease, isLoading: loadingLease } = useLease(leaseId);
  const { data: summary, isLoading: loadingSummary } = useLeaseSummary(leaseId);
  const { data: ledgers = [], isLoading: loadingLedgers } = useLedgersByLease(leaseId);

  const isLoading = loadingLease || loadingSummary || loadingLedgers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Lease Ledger Summary</h1>
          {lease && (
            <p className="text-sm text-muted-foreground mt-1">
              Financial summaries for Lease in {lease.unit?.property?.name || 'Property'} Unit {lease.unit?.unitNumber || 'Unit'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/accounting">
            <Button variant="outline">Back Dashboard</Button>
          </Link>
          <Link href={`/dashboard/accounting/charges?leaseId=${leaseId}`}>
            <Button variant="outline">View Lease Charges</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4" data-testid="lease-accounting-loading">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 bg-secondary animate-pulse rounded-lg" />
            <div className="h-32 bg-secondary animate-pulse rounded-lg" />
          </div>
          <div className="h-40 bg-secondary animate-pulse rounded-lg" />
        </div>
      ) : summary ? (
        <LeaseFinancialSummary
          summary={summary}
          ledgers={ledgers}
        />
      ) : (
        <div className="p-8 border border-dashed border-border rounded-lg text-center bg-card">
          <p className="text-sm text-muted-foreground">Ledger data not initialized for this lease.</p>
        </div>
      )}
    </div>
  );
}
