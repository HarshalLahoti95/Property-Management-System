'use client';
import * as React from 'react';
import { useReportingSummary, useOccupancyMetrics, useFinancialMetrics, useMaintenanceMetrics } from '@/features/reporting';
import { SummaryCards } from '@/features/reporting/components/widgets/SummaryCards';
import { OccupancyChart } from '@/features/reporting/components/charts/OccupancyChart';
import { RevenueChart } from '@/features/reporting/components/charts/RevenueChart';
import { MaintenanceChart } from '@/features/reporting/components/charts/MaintenanceChart';
import { CollectionRateChart } from '@/features/reporting/components/charts/CollectionRateChart';
import { LeaseExpirationCard } from '@/features/reporting/components/widgets/LeaseExpirationCard';
import { OutstandingBalanceCard } from '@/features/reporting/components/widgets/OutstandingBalanceCard';
import { RecentMaintenanceCard } from '@/features/reporting/components/widgets/RecentMaintenanceCard';
import { RecentPaymentsCard } from '@/features/reporting/components/widgets/RecentPaymentsCard';
import { ChartSkeleton } from '@/features/reporting/components/charts/ChartSkeleton';
import { ChartEmptyState } from '@/features/reporting/components/charts/ChartEmptyState';

export function LandlordDashboard() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useReportingSummary();
  const { data: occupancy, isLoading: occupancyLoading } = useOccupancyMetrics();
  const { data: financials, isLoading: financialsLoading } = useFinancialMetrics();
  const { data: maintenance, isLoading: maintenanceLoading } = useMaintenanceMetrics();

  if (summaryLoading || occupancyLoading || financialsLoading || maintenanceLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (summaryError || !summary || !occupancy || !financials || !maintenance) {
    return (
      <ChartEmptyState
        isError={true}
        title="Failed to Load Portfolio Data"
        description="We encountered an error loading your portfolio summary. Please ensure the backend services are running."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Landlord Portfolio Overview</h1>
        <p className="text-sm text-muted-foreground">Aggregates and metrics for your owned properties</p>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards summary={summary} />

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <RevenueChart paymentTrends={financials.paymentTrends} />
        <CollectionRateChart
          collectionRate={summary.collectionRate}
          totalCharged={summary.totalCharged}
          totalPaid={summary.totalPaid}
        />
        <OccupancyChart occupiedUnits={summary.occupiedUnits} totalUnits={summary.totalUnits} />
        <MaintenanceChart
          countByStatus={maintenance.countByStatus}
          countByPriority={maintenance.countByPriority}
        />
      </div>

      {/* Detailed Operations Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <LeaseExpirationCard expirations={occupancy.expirationsNext30Days} />
        <OutstandingBalanceCard
          outstandingBalance={summary.outstandingBalance}
          collectionRate={summary.collectionRate}
        />
        <RecentMaintenanceCard />
        <RecentPaymentsCard />
      </div>
    </div>
  );
}
