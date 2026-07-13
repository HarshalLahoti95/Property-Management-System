import * as React from 'react';

export default function PaymentDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-secondary animate-pulse rounded-md" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-40 bg-secondary animate-pulse rounded-md" />
        <div className="md:col-span-2 h-40 bg-secondary animate-pulse rounded-md" />
      </div>
    </div>
  );
}
