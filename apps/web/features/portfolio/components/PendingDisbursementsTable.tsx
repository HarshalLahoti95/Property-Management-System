import * as React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PendingDisbursement } from '../types';

interface Props {
  disbursements: PendingDisbursement[];
  isLoading: boolean;
}

export function PendingDisbursementsTable({ disbursements, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 flex justify-center items-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-6 w-32 bg-secondary rounded-md" />
          <div className="text-muted-foreground text-sm">Loading disbursements...</div>
        </div>
      </div>
    );
  }

  if (disbursements.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-medium text-foreground">No pending disbursements</h3>
        <p className="text-sm text-muted-foreground mt-1">
          All accounts are settled up for the current period.
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
              <th className="px-4 py-3 whitespace-nowrap">Property</th>
              <th className="px-4 py-3 whitespace-nowrap">Unit</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">Amount Owed</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {disbursements.map((item) => (
              <tr key={item.leaseId} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 align-middle font-medium text-foreground">
                  {item.propertyName}
                </td>
                
                <td className="px-4 py-3 align-middle text-muted-foreground">
                  {item.unitName}
                </td>

                <td className="px-4 py-3 align-middle text-right font-semibold text-foreground">
                  ${Number(item.amountOwed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                <td className="px-4 py-3 align-middle text-center">
                  <Link href={`/dashboard/leases/${item.leaseId}`} tabIndex={-1}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5 mx-auto">
                      View Lease
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
