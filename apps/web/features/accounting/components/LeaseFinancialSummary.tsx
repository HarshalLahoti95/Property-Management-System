'use client';
import * as React from 'react';
import { LeaseSummary, FinancialLedger } from '../types';
import { LedgerCard } from './LedgerCard';
import { OutstandingBalanceCard } from './OutstandingBalanceCard';
import { useAuth } from '@/hooks/use-auth';
import { Calendar, AlertCircle } from 'lucide-react';

export function LeaseFinancialSummary({
  summary,
  ledgers = [],
}: {
  summary: LeaseSummary;
  ledgers: FinancialLedger[];
}) {
  const { user } = useAuth();
  const isTenant = user?.role === 'TENANT';

  // Calculate outstanding sum
  const outstandingSum = summary.outstandingCharges.reduce((acc, c) => acc + Number(c.amount), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {ledgers.map((ledger) => (
          <LedgerCard key={ledger.id} ledger={ledger} />
        ))}
      </div>

      {/* Outstanding Summary Row */}
      <OutstandingBalanceCard balance={outstandingSum} showPayButton={isTenant} />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Next Due Charge */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h4 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Next Scheduled Due Charge
          </h4>
          {summary.nextDueCharge ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">
                  {summary.nextDueCharge.type.replace('_', ' ').toLowerCase()}
                </span>
                <span className="text-sm font-bold text-foreground">
                  ${Number(summary.nextDueCharge.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Due Date</span>
                <span>{new Date(summary.nextDueCharge.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No upcoming scheduled charges.
            </div>
          )}
        </div>

        {/* Charge Status Breakdown counts */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h4 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" /> Charge Activity Counts
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border rounded-md p-3 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground font-semibold">Paid</p>
              <p className="text-lg font-bold text-foreground mt-1">{summary.chargeCounts.PAID || 0}</p>
            </div>
            <div className="border border-border rounded-md p-3 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground font-semibold">Unpaid</p>
              <p className="text-lg font-bold text-destructive mt-1">{summary.chargeCounts.UNPAID || 0}</p>
            </div>
            <div className="border border-border rounded-md p-3 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground font-semibold">Partially Paid</p>
              <p className="text-lg font-bold text-primary mt-1">{summary.chargeCounts.PARTIALLY_PAID || 0}</p>
            </div>
            <div className="border border-border rounded-md p-3 text-center bg-muted/20">
              <p className="text-xs text-muted-foreground font-semibold">Voided</p>
              <p className="text-lg font-bold text-muted-foreground mt-1">{summary.chargeCounts.VOIDED || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
