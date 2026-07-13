import * as React from 'react';
import { ChartEmptyState } from './ChartEmptyState';

interface PaymentTrendPoint {
  month: string;
  amount: number;
}

interface RevenueChartProps {
  paymentTrends: PaymentTrendPoint[];
}

export function RevenueChart({ paymentTrends = [] }: RevenueChartProps) {
  if (paymentTrends.length === 0) {
    return <ChartEmptyState title="No Financial History" description="Financial revenue aggregates will appear once tenant payments are received." />;
  }

  // Dimension config
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...paymentTrends.map((t) => t.amount), 1000);
  // Grid tick counts
  const ticksY = 4;

  // Generate points
  const points = paymentTrends.map((t, idx) => {
    const x = paddingLeft + (idx / Math.max(1, paymentTrends.length - 1)) * chartWidth;
    const y = svgHeight - paddingBottom - (t.amount / maxVal) * chartHeight;
    return { x, y, month: t.month, amount: t.amount };
  });

  // Construct SVG line and area path
  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
    areaPath = `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z`;
  }

  // Format amount labels
  const formatYLabel = (val: number) => {
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val}`;
  };

  const formatMonth = (mStr: string) => {
    const parts = mStr.split('-');
    if (parts.length < 2) return mStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${months[mIdx] || parts[1]} '${parts[0].slice(2)}`;
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between h-[300px]">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Monthly Revenue History</h3>
          <p className="text-xs text-muted-foreground">Historical payment receipts cleared over the last 6 months</p>
        </div>
      </div>

      <div className="flex-1 w-full relative pt-2">
        <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
          <title id="revenue-line-chart">Monthly Revenue History Chart</title>
          <desc>Area line chart showing monthly payments trend over the last 6 months.</desc>
          <defs>
            <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary, #0f172a)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary, #0f172a)" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Axis labels */}
          {Array.from({ length: ticksY }).map((_, i) => {
            const val = (maxVal / (ticksY - 1)) * i;
            const y = svgHeight - paddingBottom - (val / maxVal) * chartHeight;
            return (
              <g key={i} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--border, #e4e4e7)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px]"
                >
                  {formatYLabel(val)}
                </text>
              </g>
            );
          })}

          {/* Area under the line */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#revenue-gradient)"
              className="transition-all duration-1000 ease-out"
            />
          )}

          {/* Line chart path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary, #0f172a)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-1000 ease-out"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="var(--background)"
                stroke="var(--primary)"
                strokeWidth="2.5"
              />
              {/* Tooltip trigger area */}
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill="transparent"
              />
              <title>{`${formatMonth(p.month)}: ₹${p.amount.toLocaleString()}`}</title>
            </g>
          ))}

          {/* X Axis labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={svgHeight - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatMonth(p.month)}
            </text>
          ))}
        </svg>
      </div>

      <span className="sr-only">
        Monthly revenue history: {paymentTrends.map((t) => `${formatMonth(t.month)} has collected ₹${t.amount}`).join(', ')}.
      </span>
    </div>
  );
}
