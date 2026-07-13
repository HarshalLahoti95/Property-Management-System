import * as React from 'react';

export default function DocumentsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-secondary animate-pulse rounded-md" />
      <div className="h-12 w-full bg-secondary animate-pulse rounded-md" />
      <div className="h-64 w-full bg-secondary animate-pulse rounded-md" />
    </div>
  );
}
