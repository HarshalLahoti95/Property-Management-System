'use client';
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WorkOrder } from '../types';
import { AlertCircle } from 'lucide-react';

export function MaintenanceDeductionDialog({
  open,
  onOpenChange,
  workOrder,
  onConfirm,
  submitting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrder: WorkOrder;
  onConfirm: () => void;
  submitting?: boolean;
}) {
  const unitLabel = workOrder.unit 
    ? `${workOrder.property?.name || 'Property'} - Unit ${workOrder.unit.unitNumber}`
    : workOrder.property?.name || 'Property';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Company Maintenance Deduction</DialogTitle>
          <DialogDescription>
            Record the actual maintenance costs against the property's lease.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-amber-50 text-amber-800 border border-amber-200 p-4 rounded-md text-sm my-2 flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <strong className="block mb-1">Warning: Company Revenue Reduction</strong>
            This action will deduct the work order's actual cost from the company's retained revenue. This <strong>does not</strong> charge the tenant. Are you sure you want to record this deduction?
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="font-semibold text-muted-foreground">Work Order:</span>
            <span className="text-foreground">{workOrder.workOrderNumber} - {workOrder.title}</span>
            
            <span className="font-semibold text-muted-foreground">Location:</span>
            <span className="text-foreground">{unitLabel}</span>
            
            <span className="font-semibold text-muted-foreground">Amount to Deduct:</span>
            <span className="text-foreground font-bold text-lg">
              ₹{Number(workOrder.actualCost || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Confirm Deduction'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
