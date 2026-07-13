import * as React from 'react';
import { ChartEmptyState } from './ChartEmptyState';

interface OccupancyChartProps {
  occupiedUnits: number;
  totalUnits: number;
}

export function OccupancyChart({ occupiedUnits, totalUnits }: OccupancyChartProps) {
  if (totalUnits === 0) {
    return <ChartEmptyState title="No Property Units Found" description="Please register properties and units to view occupancy stats." />;
  }

  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const occupancyRate = totalUnits === 0 ? 0 : parseFloat(((occupiedUnits / totalUnits) * 100).toFixed(1));
  const vacancyRate = totalUnits === 0 ? 0 : parseFloat(((vacantUnits / totalUnits) * 100).toFixed(1));

  // SVG Circle details for circular donut chart
  const size = 180;
  const strokeWidth = 16;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (occupancyRate / 100) * circumference;

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Occupancy Rate</h3>
          <p className="text-xs text-muted-foreground">Ratio of leased units to total portfolio size</p>
        </div>
      </div>

      <div className="flex items-center justify-around flex-1 gap-4">
        {/* SVG Donut Chart */}
        <div className="relative w-[140px] h-[140px]">
          <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
            <title id="occupancy-donut-title">Donut chart of occupancy rate</title>
            <desc id="occupancy-donut-desc">Displays {occupancyRate}% occupied units and {vacancyRate}% vacant units.</desc>
            {/* Vacant/Background Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--secondary, #f4f4f5)"
              strokeWidth={strokeWidth}
              className="stroke-muted"
            />
            {/* Occupied Circle */}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-foreground">{occupancyRate}%</span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Occupied</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-primary" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Leased Units</span>
              <span className="text-xs text-muted-foreground">{occupiedUnits} units ({occupancyRate}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-muted" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground">Vacant Units</span>
              <span className="text-xs text-muted-foreground">{vacantUnits} units ({vacancyRate}%)</span>
            </div>
          </div>

          <div className="border-t border-border pt-2 text-xs font-medium text-foreground">
            Total portfolio size: {totalUnits} Units
          </div>
        </div>
      </div>

      <span className="sr-only">
        Occupancy Rate: {occupancyRate} percent. {occupiedUnits} units leased. Total portfolio size is {totalUnits} units.
      </span>
    </div>
  );
}
