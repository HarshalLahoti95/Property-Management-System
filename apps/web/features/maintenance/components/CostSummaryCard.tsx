import * as React from 'react';
import { WorkOrder } from '../types';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

export function CostSummaryCard({ workOrder }: { workOrder: WorkOrder }) {
  const est = workOrder.estimatedCost ? Number(workOrder.estimatedCost) : 0;
  const act = workOrder.actualCost ? Number(workOrder.actualCost) : 0;
  const hasEst = workOrder.estimatedCost !== null;
  const hasAct = workOrder.actualCost !== null;

  const costDifference = act - est;
  const isOverBudget = costDifference > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" /> Cost & Budget Overview
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Estimated</p>
          <p className="text-xl font-bold text-foreground">
            {hasEst ? `₹${est.toFixed(2)}` : 'N/A'}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Actual Cost</p>
          <p className="text-xl font-bold text-foreground">
            {hasAct ? `₹${act.toFixed(2)}` : 'N/A'}
          </p>
        </div>
      </div>

      {hasEst && hasAct && (
        <div
          className={`flex items-center gap-2 text-xs font-semibold p-2.5 rounded-md border ${
            isOverBudget
              ? 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30'
              : 'bg-green-50 text-green-950 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900/30'
          }`}
        >
          {isOverBudget ? (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>Over budget by ₹{costDifference.toFixed(2)}</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              <span>Under budget by ₹{Math.abs(costDifference).toFixed(2)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
