'use client';
import * as React from 'react';
import { useFinancialMetrics } from '@/features/reporting';
import { RevenueChart } from '@/features/reporting/components/charts/RevenueChart';
import { CollectionRateChart } from '@/features/reporting/components/charts/CollectionRateChart';
import { OutstandingBalanceCard } from '@/features/reporting/components/widgets/OutstandingBalanceCard';
import { RecentPaymentsCard } from '@/features/reporting/components/widgets/RecentPaymentsCard';
import { CSVDownloadButton } from '@/features/reporting/components/widgets/CSVDownloadButton';
import { ChartSkeleton } from '@/features/reporting/components/charts/ChartSkeleton';
import { ChartEmptyState } from '@/features/reporting/components/charts/ChartEmptyState';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FinancialsReportPage() {
  const { data: financials, isLoading, isError } = useFinancialMetrics();

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

  if (isError || !financials) {
    return (
      <ChartEmptyState
        isError={true}
        title="Failed to Load Financial Metrics"
        description="Unable to fetch financial receipts aggregates and revenue trends from NestJS reporting repository."
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Financial Collections & Receipts</h1>
          <p className="text-xs text-muted-foreground">Detailed revenue metrics and receipts history</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl shadow-sm">
        <span className="text-xs text-muted-foreground">
          Total rent collected: <strong>${financials.totalPaid.toLocaleString()}</strong> of <strong>${financials.totalCharged.toLocaleString()}</strong>
        </span>
        <CSVDownloadButton type="financials" label="Download Financials CSV" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RevenueChart paymentTrends={financials.paymentTrends} />
        <CollectionRateChart
          collectionRate={financials.collectionRate}
          totalCharged={financials.totalCharged}
          totalPaid={financials.totalPaid}
        />
        <OutstandingBalanceCard
          outstandingBalance={financials.outstanding}
          collectionRate={financials.collectionRate}
        />
        <RecentPaymentsCard />
      </div>
    </div>
  );
}
