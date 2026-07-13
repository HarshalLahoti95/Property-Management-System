'use client';
import * as React from 'react';
import { WorkOrder } from '../types';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Calendar, MapPin, User, DollarSign } from 'lucide-react';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onAssignVendorClick?: () => void;
  onTransitionStatusClick?: () => void;
  onEditClick?: () => void;
}

export function WorkOrderCard({
  workOrder,
  onAssignVendorClick,
  onTransitionStatusClick,
  onEditClick,
}: WorkOrderCardProps) {
  const { user } = useAuth();
  const isLandlordOrAdmin = user?.role === 'ADMIN' || user?.role === 'LANDLORD';

  const hasEstimatedCost = workOrder.estimatedCost !== null;
  const hasActualCost = workOrder.actualCost !== null;

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border pb-4 flex-wrap gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-md">
              {workOrder.workOrderNumber}
            </span>
            <PriorityBadge priority={workOrder.priority} />
          </div>
          <h2 className="text-xl font-bold text-foreground mt-1">{workOrder.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <WorkOrderStatusBadge status={workOrder.status} />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
            <p className="text-sm font-medium text-foreground">
              {workOrder.property?.name || 'Property'}
              {workOrder.unit ? `, Unit ${workOrder.unit.unitNumber}` : ' (Property-wide)'}
            </p>
            <p className="text-xs text-muted-foreground">{workOrder.property?.address}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Target Date</p>
            <p className="text-sm font-medium text-foreground">
              {workOrder.targetCompletionDate
                ? new Date(workOrder.targetCompletionDate).toLocaleDateString()
                : 'Not scheduled'}
            </p>
            <p className="text-xs text-muted-foreground">
              Submitted on {new Date(workOrder.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Assigned Vendor</p>
            <p className="text-sm font-medium text-foreground">
              {workOrder.vendor?.name || 'No vendor assigned'}
            </p>
            {workOrder.vendor && (
              <p className="text-xs text-muted-foreground">
                {workOrder.vendor.specialty} • {workOrder.vendor.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Costs</p>
            <div className="text-sm font-medium text-foreground space-y-0.5">
              <p>Estimated: {hasEstimatedCost ? `₹${Number(workOrder.estimatedCost).toFixed(2)}` : 'N/A'}</p>
              <p>Actual: {hasActualCost ? `₹${Number(workOrder.actualCost).toFixed(2)}` : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p>
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {workOrder.description}
        </p>
      </div>

      {/* Action panel */}
      {isLandlordOrAdmin && (
        <div className="flex items-center gap-2 border-t border-border pt-4 justify-end flex-wrap">
          {onEditClick && (
            <Button variant="outline" size="sm" onClick={onEditClick}>
              Edit Work Order
            </Button>
          )}
          {onAssignVendorClick && (
            <Button variant="outline" size="sm" onClick={onAssignVendorClick}>
              Assign Vendor
            </Button>
          )}
          {onTransitionStatusClick && (
            <Button variant="default" size="sm" onClick={onTransitionStatusClick}>
              Update Status
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
