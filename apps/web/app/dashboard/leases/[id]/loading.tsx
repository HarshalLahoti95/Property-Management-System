import * as React from 'react';

export default function LeaseDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-secondary animate-pulse rounded-md" />
      <div className="h-40 w-full bg-secondary animate-pulse rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 bg-secondary animate-pulse rounded-md" />
        <div className="h-48 bg-secondary animate-pulse rounded-md" />
      </div>
    </div>
  );
}
