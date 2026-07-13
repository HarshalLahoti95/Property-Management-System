'use client';
import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { reportingKeys, reportingService } from '@/features/reporting';
import { CSVDownloadButton } from '@/features/reporting/components/widgets/CSVDownloadButton';
import { Building, DollarSign, Wrench, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function ReportsHomePage() {
  const queryClient = useQueryClient();

  // Prefetch all report datasets on page mount
  React.useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: reportingKeys.summary(),
      queryFn: () => reportingService.getSummary(),
    });
    queryClient.prefetchQuery({
      queryKey: reportingKeys.occupancy(),
      queryFn: () => reportingService.getOccupancy(),
    });
    queryClient.prefetchQuery({
      queryKey: reportingKeys.financials(),
      queryFn: () => reportingService.getFinancials(),
    });
    queryClient.prefetchQuery({
      queryKey: reportingKeys.maintenance(),
      queryFn: () => reportingService.getMaintenance(),
    });
  }, [queryClient]);

  const reportSections = [
    {
      title: 'Occupancy & Vacancy Analytics',
      description: 'Review portfolio-wide occupancy rates, vacant units tracking, and upcoming lease expirations.',
      href: '/dashboard/reports/occupancy',
      icon: Building,
      colorClass: 'text-blue-500 bg-blue-500/10',
    },
    {
      title: 'Financial Collections & Receipts',
      description: 'Audit monthly revenues, rent collection efficiency, and outstanding tenant balances.',
      href: '/dashboard/reports/financials',
      icon: DollarSign,
      colorClass: 'text-green-500 bg-green-500/10',
    },
    {
      title: 'Maintenance Issues & Costs',
      description: 'Analyze work orders by status/priority, check resolution times, and review estimated vs actual invoice costs.',
      href: '/dashboard/reports/maintenance',
      icon: Wrench,
      colorClass: 'text-purple-500 bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">System Analytics & Reports</h1>
          <p className="text-sm text-muted-foreground">Select a category below to view detailed breakdown logs and visual trends.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CSVDownloadButton type="leases" label="Export Leases CSV" />
          <CSVDownloadButton type="financials" label="Export Financials CSV" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {reportSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.title}
              href={section.href}
              className="group p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-3">
                <div className={`p-3 rounded-xl inline-block ${section.colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pt-4 border-t border-border/30 mt-4">
                <span>View Details</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
