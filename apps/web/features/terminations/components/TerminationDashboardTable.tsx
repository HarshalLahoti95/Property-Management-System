import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TerminationDashboardItem } from '../types';

interface Props {
  data: TerminationDashboardItem[];
  isLoading: boolean;
}

export function TerminationDashboardTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex justify-center items-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-6 w-32 bg-secondary rounded-md" />
          <div className="text-muted-foreground text-sm">Loading terminations dashboard...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-medium text-foreground">No leases found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No leases match the current filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Property / Unit</th>
              <th className="px-4 py-3 whitespace-nowrap">Tenants</th>
              <th className="px-4 py-3 whitespace-nowrap">End Date</th>
              <th className="px-4 py-3 whitespace-nowrap">Deadline</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Trust Balance</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Tenant Debt</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Owed to Landlord</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr key={item.leaseId} className="hover:bg-muted/50 transition-colors group">
                <td className="px-4 py-3 align-top">
                  <div className="font-semibold text-foreground">{item.propertyName}</div>
                  <div className="text-xs text-muted-foreground">Unit {item.unitName}</div>
                </td>
                
                <td className="px-4 py-3 align-top">
                  {item.tenants.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {item.tenants.map((t, i) => (
                        <div key={i} className="text-foreground">
                          {t.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">No tenants</span>
                  )}
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-1.5">
                    <span>{new Date(item.actualEndDate).toLocaleDateString()}</span>
                    {item.actualEndDateIsEstimated && (
                      <span title="Estimated from original lease terms. No explicit termination date recorded.">
                        <AlertCircle className="w-4 h-4 text-amber-500 cursor-help shrink-0" />
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={item.isDeadlinePassed ? 'font-bold text-destructive' : 'text-foreground'}>
                      {new Date(item.gracePeriodDeadline).toLocaleDateString()}
                    </span>
                    {item.isDeadlinePassed && (
                      <Badge variant="destructive" className="text-[10px] uppercase h-5 px-1.5">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 align-top text-right">
                  <span className="font-medium">
                    ${Number(item.trustBalance).toFixed(2)}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-right">
                  <span className={Number(item.outstandingTenantDebt) > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    ${Number(item.outstandingTenantDebt).toFixed(2)}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-right">
                  <span className="font-medium">
                    ${Number(item.amountOwedToLandlord).toFixed(2)}
                  </span>
                </td>

                <td className="px-4 py-3 align-top text-center">
                  <Link href={`/dashboard/leases/${item.leaseId}`} tabIndex={-1}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
                      View
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
