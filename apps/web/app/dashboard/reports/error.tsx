'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function ReportsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-card border border-border rounded-xl">
      <h3 className="text-lg font-bold text-foreground mb-2">Error Loading Reports</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        We encountered an error retrieving the reporting dashboard metrics. Please make sure you have ADMIN or LANDLORD credentials.
      </p>
      <Button onClick={() => reset()} size="sm">
        Retry
      </Button>
    </div>
  );
}
