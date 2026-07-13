import * as React from 'react';
import { FinancialLedger } from '../types';
import { LedgerBalanceCard } from './LedgerBalanceCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function LedgerCard({ ledger }: { ledger: FinancialLedger }) {
  const isOperating = ledger.ledgerType === 'OPERATING';
  return (
    <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between space-y-4">
      <div>
        <h4 className="font-semibold text-lg text-foreground mb-1">
          {isOperating ? 'Operating Ledger' : 'Trust Ledger'}
        </h4>
        <p className="text-xs text-muted-foreground font-mono truncate">
          ID: {ledger.id}
        </p>
      </div>
      <div>
        <LedgerBalanceCard
          title="Current Ledger Balance"
          balance={ledger.runningBalance}
          type={isOperating ? 'operating' : 'trust'}
          description={isOperating ? 'Tracks standard rent, late fees, utilities' : 'Holds refundable security deposits'}
        />
      </div>
      <div className="pt-2">
        <Link href={`/dashboard/accounting/ledgers/${ledger.id}`}>
          <Button variant="outline" className="w-full">
            View Ledger History
          </Button>
        </Link>
      </div>
    </div>
  );
}
