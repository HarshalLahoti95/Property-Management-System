import * as React from 'react';
import { ChartSkeleton } from '@/features/reporting/components/charts/ChartSkeleton';

export default function MaintenanceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3 mb-6" />
      <div className="grid gap-6 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
