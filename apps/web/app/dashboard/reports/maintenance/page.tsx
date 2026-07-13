'use client';
import * as React from 'react';
import { useMaintenanceMetrics } from '@/features/reporting';
import { MaintenanceChart } from '@/features/reporting/components/charts/MaintenanceChart';
import { RecentMaintenanceCard } from '@/features/reporting/components/widgets/RecentMaintenanceCard';
import { ChartSkeleton } from '@/features/reporting/components/charts/ChartSkeleton';
import { ChartEmptyState } from '@/features/reporting/components/charts/ChartEmptyState';
import { ArrowLeft, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function MaintenanceReportPage() {
  const { data: maintenance, isLoading, isError } = useMaintenanceMetrics();

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

  if (isError || !maintenance) {
    return (
      <ChartEmptyState
        isError={true}
        title="Failed to Load Maintenance Metrics"
        description="Unable to fetch work orders, completion times, and cost aggregates from NestJS reporting repository."
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Maintenance Issues & Costs</h1>
          <p className="text-xs text-muted-foreground">Portfolio-wide work order statistics and cost auditing</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-5 bg-card border border-border rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Average Completion Time</span>
            <div className="text-xl font-bold text-foreground">
              {maintenance.averageCompletionTimeDays.toFixed(1)} Days
            </div>
            <p className="text-[10px] text-muted-foreground">Mean request resolution time</p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Costs</span>
            <div className="text-xl font-bold text-foreground">
              ${maintenance.totalEstimatedCost.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground">Aggregated cost estimate</p>
          </div>
          <div className="p-3 bg-zinc-500/10 text-zinc-500 rounded-full">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-card border border-border rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actual Costs Invoiced</span>
            <div className="text-xl font-bold text-green-600 dark:text-green-500">
              ${maintenance.totalActualCost.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground">Aggregated invoice total</p>
          </div>
          <div className="p-3 bg-green-500/10 text-green-500 rounded-full">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MaintenanceChart
          countByStatus={maintenance.countByStatus}
          countByPriority={maintenance.countByPriority}
        />
        <RecentMaintenanceCard />
      </div>
    </div>
  );
}
