import * as React from 'react';
import { AlertCircle, BarChart3 } from 'lucide-react';

interface ChartEmptyStateProps {
  title?: string;
  description?: string;
  isError?: boolean;
}

export function ChartEmptyState({
  title = 'No Data Available',
  description = 'There is currently no report data matching your criteria.',
  isError = false,
}: ChartEmptyStateProps) {
  const Icon = isError ? AlertCircle : BarChart3;

  return (
    <div
      role="region"
      aria-label="No data available notice"
      className="w-full h-[300px] flex flex-col items-center justify-center p-6 bg-card border border-border border-dashed rounded-xl text-center"
    >
      <div
        className={`p-3 rounded-full mb-3 ${
          isError ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
