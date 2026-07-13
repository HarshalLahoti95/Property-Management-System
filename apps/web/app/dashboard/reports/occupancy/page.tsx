'use client';
import * as React from 'react';
import { useOccupancyMetrics } from '@/features/reporting';
import { OccupancyChart } from '@/features/reporting/components/charts/OccupancyChart';
import { LeaseExpirationCard } from '@/features/reporting/components/widgets/LeaseExpirationCard';
import { CSVDownloadButton } from '@/features/reporting/components/widgets/CSVDownloadButton';
import { ChartSkeleton } from '@/features/reporting/components/charts/ChartSkeleton';
import { ChartEmptyState } from '@/features/reporting/components/charts/ChartEmptyState';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OccupancyReportPage() {
  const { data: occupancy, isLoading, isError } = useOccupancyMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/4" />
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !occupancy) {
    return (
      <ChartEmptyState
        isError={true}
        title="Failed to Load Occupancy Metrics"
        description="Unable to fetch occupancy rates and lease expiration history from NestJS reporting repository."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Occupancy & Vacancy Analytics</h1>
          <p className="text-xs text-muted-foreground">Portfolio-wide vacancy trends and lease metrics</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
        <span className="text-xs text-muted-foreground">
          Leased units: <strong>{occupancy.occupiedUnits}</strong> of <strong>{occupancy.totalUnits}</strong>
        </span>
        <CSVDownloadButton type="leases" label="Download Leases CSV" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <OccupancyChart occupiedUnits={occupancy.occupiedUnits} totalUnits={occupancy.totalUnits} />
        <LeaseExpirationCard expirations={occupancy.expirationsNext30Days} />
      </div>
    </div>
  );
}
