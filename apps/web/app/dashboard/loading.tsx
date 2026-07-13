import * as React from 'react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse p-6">
      <div className="h-8 bg-muted rounded w-1/4 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-28 bg-muted/60 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <div className="h-[300px] bg-muted/50 rounded-xl" />
        <div className="h-[300px] bg-muted/50 rounded-xl" />
      </div>
    </div>
  );
}
