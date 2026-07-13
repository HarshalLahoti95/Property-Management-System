import * as React from 'react';
import { WorkOrderStatusHistory } from '../types';
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge';
import { History, ArrowRight, User, ShieldAlert } from 'lucide-react';

export function HistoryTimeline({ history = [] }: { history: WorkOrderStatusHistory[] }) {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
        <History className="h-5 w-5 text-primary" /> Audit Trail & History
      </h3>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 italic">No history trail recorded yet.</p>
      ) : (
        <div className="relative pl-6 border-l border-border space-y-6">
          {history.map((event) => {
            const hasVendorChange = event.assignedVendor || event.previousVendor;
            const hasStatusChange = event.oldStatus !== null;

            return (
              <div key={event.id} className="relative space-y-2">
                {/* Visual bullet indicator */}
                <div className="absolute -left-[31px] top-1 bg-background border border-border h-4.5 w-4.5 rounded-full flex items-center justify-center">
                  <ShieldAlert className="h-2.5 w-2.5 text-primary" />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                  <span className="font-bold text-foreground inline-flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {event.changedByUser?.fullName || 'System Event'}
                  </span>
                  <span>{new Date(event.changedAt).toLocaleString()}</span>
                </div>

                <div className="text-sm text-foreground bg-muted/30 border border-border/40 p-3 rounded-lg space-y-2">
                  {/* Status update flow */}
                  {hasStatusChange && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-semibold text-muted-foreground">Status:</span>
                      {event.oldStatus && <WorkOrderStatusBadge status={event.oldStatus} />}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <WorkOrderStatusBadge status={event.newStatus} />
                    </div>
                  )}

                  {/* Vendor Assignment audits */}
                  {hasVendorChange && (
                    <div className="text-xs space-y-1">
                      {event.previousVendor && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold">Previous Vendor:</span>{' '}
                          {event.previousVendor.name}
                        </p>
                      )}
                      {event.assignedVendor && (
                        <p className="text-foreground font-medium">
                          <span className="font-semibold text-muted-foreground">Assigned Vendor:</span>{' '}
                          {event.assignedVendor.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Audit comments */}
                  {event.reasonDescription && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed pt-1 border-t border-border/20">
                      Reason: &ldquo;{event.reasonDescription}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
