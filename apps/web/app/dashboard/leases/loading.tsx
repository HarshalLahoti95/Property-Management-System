import * as React from 'react';

export default function LeasesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 bg-secondary animate-pulse rounded-md animate-in duration-300" />
      <div className="h-12 w-full bg-secondary animate-pulse rounded-md" />
      <div className="h-40 w-full bg-secondary animate-pulse rounded-md" />
    </div>
  );
}
