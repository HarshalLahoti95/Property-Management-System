import * as React from 'react';

export default function LeaseAccountingLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-secondary animate-pulse rounded-md" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 bg-secondary animate-pulse rounded-md" />
        <div className="h-32 bg-secondary animate-pulse rounded-md" />
      </div>
      <div className="h-40 w-full bg-secondary animate-pulse rounded-md" />
    </div>
  );
}
