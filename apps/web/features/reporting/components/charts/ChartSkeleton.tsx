import * as React from 'react';

export function ChartSkeleton() {
  return (
    <div className="w-full h-[300px] flex flex-col justify-between p-6 bg-card border border-border rounded-xl animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-1/12" />
      </div>
      <div className="flex items-end gap-3 h-[180px] w-full pt-4">
        <div className="h-[20%] bg-muted/60 rounded w-full" />
        <div className="h-[40%] bg-muted/60 rounded w-full" />
        <div className="h-[60%] bg-muted/60 rounded w-full" />
        <div className="h-[30%] bg-muted/60 rounded w-full" />
        <div className="h-[80%] bg-muted/60 rounded w-full" />
        <div className="h-[50%] bg-muted/60 rounded w-full" />
        <div className="h-[95%] bg-muted/60 rounded w-full" />
      </div>
      <div className="flex justify-between w-full text-xs text-muted-foreground mt-2">
        <div className="h-3 bg-muted rounded w-1/12" />
        <div className="h-3 bg-muted rounded w-1/12" />
        <div className="h-3 bg-muted rounded w-1/12" />
        <div className="h-3 bg-muted rounded w-1/12" />
        <div className="h-3 bg-muted rounded w-1/12" />
      </div>
    </div>
  );
}
