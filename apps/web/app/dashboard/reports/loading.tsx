import * as React from 'react';

export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse p-6">
      <div className="h-8 bg-muted rounded w-1/4 mb-6" />
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-56 bg-muted/60 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
