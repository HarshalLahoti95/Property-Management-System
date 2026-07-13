'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function FinancialsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-card border border-border rounded-xl">
      <h3 className="text-lg font-bold text-foreground mb-2">Error Loading Financials Report</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        We encountered an error loading the financial dataset. Please check your credentials and try again.
      </p>
      <Button onClick={() => reset()} size="sm">
        Retry
      </Button>
    </div>
  );
}
