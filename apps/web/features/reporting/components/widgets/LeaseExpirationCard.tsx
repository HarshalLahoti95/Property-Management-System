import * as React from 'react';
import { Calendar, User } from 'lucide-react';
import { OccupancyLeaseExpiration } from '../../types';

interface LeaseExpirationCardProps {
  expirations: OccupancyLeaseExpiration[];
}

export function LeaseExpirationCard({ expirations = [] }: LeaseExpirationCardProps) {
  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-[350px]">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Upcoming Lease Expirations (30 Days)</h3>
        <p className="text-xs text-muted-foreground">Active leases approaching term end dates</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {expirations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <Calendar className="w-8 h-8 opacity-40 mb-2" />
            <p className="text-xs">No lease expirations approaching in the next 30 days.</p>
          </div>
        ) : (
          expirations.map((exp) => (
            <div
              key={exp.leaseId}
              className="p-3 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
            >
              <div className="space-y-1">
                <div className="font-semibold text-foreground">
                  {exp.property} — Unit {exp.unit}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{exp.tenants.join(', ') || 'No registered tenants'}</span>
                </div>
              </div>
              <div className="text-right sm:text-right flex items-center justify-between sm:justify-end sm:flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">End Date</span>
                <span className="font-semibold text-amber-600 dark:text-amber-500">
                  {new Date(exp.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
