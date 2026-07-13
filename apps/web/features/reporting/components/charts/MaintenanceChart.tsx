import * as React from 'react';
import { ChartEmptyState } from './ChartEmptyState';

interface MaintenanceChartProps {
  countByStatus: Record<string, number>;
  countByPriority?: Record<string, number>;
}

export function MaintenanceChart({ countByStatus = {} }: MaintenanceChartProps) {
  const totalStatus = Object.values(countByStatus).reduce((a, b) => a + b, 0);

  if (totalStatus === 0) {
    return <ChartEmptyState title="No Work Orders" description="Maintenance completion logs will appear once tenant maintenance requests are logged." />;
  }

  const maxVal = Math.max(...Object.values(countByStatus), 1);

  // Status key display configs
  const statusConfig: Record<string, { label: string; colorClass: string; barColor: string }> = {
    SUBMITTED: { label: 'Submitted', colorClass: 'bg-zinc-500', barColor: 'rgb(115, 115, 115)' },
    ASSIGNED: { label: 'Assigned', colorClass: 'bg-purple-500', barColor: 'rgb(168, 85, 247)' },
    IN_PROGRESS: { label: 'In Progress', colorClass: 'bg-blue-500', barColor: 'rgb(59, 130, 246)' },
    ON_HOLD: { label: 'On Hold', colorClass: 'bg-yellow-500', barColor: 'rgb(234, 179, 8)' },
    RESOLVED: { label: 'Resolved', colorClass: 'bg-green-500', barColor: 'rgb(34, 197, 94)' },
    CANCELLED: { label: 'Cancelled', colorClass: 'bg-red-500', barColor: 'rgb(239, 68, 68)' },
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between h-[300px]">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Maintenance Status Distributions</h3>
        <p className="text-xs text-muted-foreground">Volume count of work orders by lifecycle stage</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3 pt-2">
        {Object.entries(countByStatus).map(([statusKey, count]) => {
          const config = statusConfig[statusKey] || { label: statusKey, colorClass: 'bg-muted', barColor: 'gray' };
          const percentage = (count / maxVal) * 100;

          return (
            <div key={statusKey} className="flex items-center w-full gap-4">
              {/* Status Label */}
              <div className="w-24 text-xs font-semibold text-foreground text-left truncate">
                {config.label}
              </div>

              {/* Progress Bar Wrapper */}
              <div className="flex-1 h-3.5 bg-muted rounded-full relative overflow-hidden">
                <div
                  style={{ width: `${percentage}%`, backgroundColor: config.barColor }}
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                />
              </div>

              {/* Count Badge */}
              <div className="w-8 text-right text-xs font-bold text-foreground">
                {count}
              </div>
            </div>
          );
        })}
      </div>

      <span className="sr-only">
        Work order status counts: {Object.entries(countByStatus).map(([k, v]) => `${k} has ${v} items`).join(', ')}.
      </span>
    </div>
  );
}
