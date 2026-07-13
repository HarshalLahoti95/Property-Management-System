import * as React from 'react';
import { ChartEmptyState } from './ChartEmptyState';

interface CollectionRateChartProps {
  collectionRate: number;
  totalCharged: number;
  totalPaid: number;
}

export function CollectionRateChart({ collectionRate, totalCharged, totalPaid }: CollectionRateChartProps) {
  if (totalCharged === 0) {
    return <ChartEmptyState title="No Charges Yet" description="Rent collection rate metrics will display once rental invoices are generated." />;
  }

  // Semi-circle gauge configuration
  const size = 180;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth;
  
  // Circumference of semi-circle is Math.PI * radius
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, collectionRate)) / 100) * circumference;

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between h-[300px]">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Rent Collection Rate</h3>
        <p className="text-xs text-muted-foreground">Percentage of total charged rent that has been paid and cleared</p>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 relative pt-4">
        {/* SVG Semi-Circle Gauge */}
        <div className="relative w-[180px] h-[100px] overflow-hidden">
          <svg className="w-full h-full" viewBox={`0 0 ${size} ${center}`}>
            <title id="collections-gauge-title">Rent Collection Gauge Chart</title>
            <desc>Displays rent collection rate as {collectionRate}% of total charged rent.</desc>
            {/* Background Arch */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--secondary, #f4f4f5)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={0}
              className="stroke-muted"
            />
            {/* Value Progress Arch */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--primary, #0f172a)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="stroke-primary transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end text-center">
            <span className="text-3xl font-extrabold text-foreground leading-none">{collectionRate}%</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">Collected</span>
          </div>
        </div>

        {/* Legend metrics */}
        <div className="flex justify-between w-full border-t border-border pt-4 text-xs">
          <div className="flex flex-col text-left">
            <span className="text-muted-foreground">Total Invoiced:</span>
            <span className="font-bold text-foreground">₹{totalCharged.toLocaleString()}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-muted-foreground">Total Collected:</span>
            <span className="font-bold text-green-600 dark:text-green-500">₹{totalPaid.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <span className="sr-only">
        Rent collection rate is {collectionRate} percent. Total charged: ₹{totalCharged}. Total collected: ₹{totalPaid}.
      </span>
    </div>
  );
}
