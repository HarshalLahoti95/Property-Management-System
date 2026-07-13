import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { WorkOrderPriority } from '../types';

export function PriorityBadge({ priority }: { priority: WorkOrderPriority }) {
  const labelMap: Record<WorkOrderPriority, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    EMERGENCY: 'Emergency',
  };

  const colorMap: Record<WorkOrderPriority, string> = {
    LOW: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-slate-200',
    MEDIUM: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800',
    HIGH: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800',
    EMERGENCY: 'bg-red-100 text-red-900 border-red-300 animate-pulse font-extrabold shadow-sm dark:bg-red-950 dark:text-red-200 dark:border-red-800',
  };

  return (
    <Badge
      variant="outline"
      className={`capitalize border ${colorMap[priority] || ''}`}
    >
      {labelMap[priority] || priority}
    </Badge>
  );
}
