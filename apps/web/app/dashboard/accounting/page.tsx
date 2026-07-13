'use client';
import * as React from 'react';
import { useLeases } from '@/features/lease';
import {
  useLeaseSummary,
  useLedgersByLease,
  LeaseFinancialSummary,
} from '@/features/accounting';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AccountingPage() {
  const { data: leases = [], isLoading: loadingLeases } = useLeases();
  const [selectedLeaseId, setSelectedLeaseId] = React.useState('');

  // Auto-select first lease when list loads
  React.useEffect(() => {
    if (leases.length > 0 && !selectedLeaseId) {
      setSelectedLeaseId(leases[0].id);
    }
  }, [leases, selectedLeaseId]);

  const { data: summary, isLoading: loadingSummary } = useLeaseSummary(selectedLeaseId);
  const { data: ledgers = [], isLoading: loadingLedgers } = useLedgersByLease(selectedLeaseId);

  const selectedLease = leases.find((l) => l.id === selectedLeaseId);

  const isLoading = loadingLeases || (!!selectedLeaseId && (loadingSummary || loadingLedgers));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Accounting Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review ledger balances, outstanding rent charges, and transaction activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/accounting/charges">
            <Button variant="outline">Manage Charges</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-lg">
        <div className="space-y-1">
          <label htmlFor="lease-select" className="text-xs font-semibold text-muted-foreground uppercase">
            Selected Lease Agreement
          </label>
          {loadingLeases ? (
            <div className="h-9 w-48 bg-secondary animate-pulse rounded-md" />
          ) : (
            <select
              id="lease-select"
              value={selectedLeaseId}
              onChange={(e) => setSelectedLeaseId(e.target.value)}
              className="w-full sm:w-64 h-9 rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm cursor-pointer"
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
          )}
        </div>
        {selectedLeaseId && (
          <Link href={`/dashboard/accounting/leases/${selectedLeaseId}`}>
            <Button variant="secondary" size="sm">
              View Detailed Lease Ledgers
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4" data-testid="dashboard-loading">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 bg-secondary animate-pulse rounded-lg" />
            <div className="h-32 bg-secondary animate-pulse rounded-lg" />
          </div>
          <div className="h-20 bg-secondary animate-pulse rounded-lg" />
        </div>
      ) : selectedLeaseId && summary ? (
        <LeaseFinancialSummary
          summary={summary}
          ledgers={ledgers}
        />
      ) : (
        <div className="p-8 border border-dashed border-border rounded-lg text-center bg-card">
          <p className="text-sm text-muted-foreground">
            No active leases found. Please create a lease first.
          </p>
        </div>
      )}
    </div>
  );
}
