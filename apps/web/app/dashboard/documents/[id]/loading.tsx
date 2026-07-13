import * as React from 'react';

export default function DocumentDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-secondary animate-pulse rounded-md" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 h-96 bg-secondary animate-pulse rounded-md" />
        <div className="h-48 bg-secondary animate-pulse rounded-md" />
      </div>
    </div>
  );
}
