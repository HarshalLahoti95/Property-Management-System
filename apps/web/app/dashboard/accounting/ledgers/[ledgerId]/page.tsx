'use client';
import * as React from 'react';
import { use } from 'react';
import { useLedgerHistory } from '@/features/accounting';
import { LedgerHistoryTable } from '@/features/accounting/components/LedgerHistoryTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LedgerDetailPage({
  params,
}: {
  params: Promise<{ ledgerId: string }>;
}) {
  const resolvedParams = use(params);
  const ledgerId = resolvedParams.ledgerId;
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useLedgerHistory(ledgerId, page, 10);

  const histories = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Ledger Balance History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete transaction activity history audit and ending balance tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/accounting">
            <Button variant="outline">Back Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-lg space-y-4 shadow-sm">
        <div className="border-b border-border pb-4 flex items-center justify-between">
          <h4 className="font-semibold text-lg text-foreground">Ledger Transaction Logs</h4>
          <span className="text-xs font-mono bg-muted text-muted-foreground px-2 py-1 rounded-md">
            ID: {ledgerId}
          </span>
        </div>

        <LedgerHistoryTable
          histories={histories}
          loading={isLoading}
          page={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
