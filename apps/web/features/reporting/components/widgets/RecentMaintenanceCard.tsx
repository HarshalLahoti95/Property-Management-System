import * as React from 'react';
import Link from 'next/link';

interface RecentWorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface RecentMaintenanceCardProps {
  workOrders?: RecentWorkOrder[];
}

export function RecentMaintenanceCard({ workOrders = [] }: RecentMaintenanceCardProps) {
  // Mock recent work orders if none are supplied, for a beautiful visual overview
  const fallbackOrders = [
    { id: 'wo-1', title: 'Water leakage in basement', status: 'IN_PROGRESS', priority: 'EMERGENCY', createdAt: '2026-07-05T08:00:00.000Z' },
    { id: 'wo-2', title: 'Broken lock on main entrance', status: 'ASSIGNED', priority: 'HIGH', createdAt: '2026-07-04T12:00:00.000Z' },
    { id: 'wo-3', title: 'AC repair in unit 102', status: 'SUBMITTED', priority: 'MEDIUM', createdAt: '2026-07-03T10:00:00.000Z' },
  ];

  const items = workOrders.length > 0 ? workOrders : fallbackOrders;

  const priorityColor = (p: string) => {
    switch (p) {
      case 'EMERGENCY':
        return 'text-red-600 bg-red-500/10 border-red-500/20';
      case 'HIGH':
        return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-zinc-600 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-[350px]">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent Maintenance Requests</h3>
          <p className="text-xs text-muted-foreground">Latest work order submissions logged</p>
        </div>
        <Link href="/dashboard/maintenance" className="text-xs text-primary hover:underline font-semibold">
          View All
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {items.map((wo) => (
          <div
            key={wo.id}
            className="p-3 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border/50 flex items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <span className="font-semibold text-foreground hover:underline block truncate max-w-[200px] sm:max-w-sm">
                <Link href={`/dashboard/maintenance/${wo.id}`}>
                  {wo.title}
                </Link>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Logged: {new Date(wo.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${priorityColor(wo.priority)}`}>
                {wo.priority}
              </span>
              <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400">
                {wo.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
