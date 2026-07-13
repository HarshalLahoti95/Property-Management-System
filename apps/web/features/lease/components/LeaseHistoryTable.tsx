import * as React from 'react';
import { LeaseStatusHistory } from '../types';
import { LeaseStatusBadge } from './LeaseStatusBadge';

export function LeaseHistoryTable({ histories = [] }: { histories: LeaseStatusHistory[] }) {
  if (histories.length === 0) {
    return (
      <div className="p-4 border border-dashed border-border rounded-md text-center bg-card">
        <p className="text-sm text-muted-foreground">No status transition history recorded.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border rounded-md bg-card">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
            <th className="p-3">Timestamp</th>
            <th className="p-3">Previous Status</th>
            <th className="p-3">New Status</th>
            <th className="p-3">Changed By</th>
            <th className="p-3">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-foreground">
          {histories.map((h) => (
            <tr key={h.id} className="hover:bg-muted/30 transition-colors">
              <td className="p-3 whitespace-nowrap">
                {new Date(h.changedAt).toLocaleString()}
              </td>
              <td className="p-3">
                {h.oldStatus ? (
                  <LeaseStatusBadge status={h.oldStatus} />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-3">
                <LeaseStatusBadge status={h.newStatus} />
              </td>
              <td className="p-3">{h.changedByUser?.fullName || 'System'}</td>
              <td className="p-3 text-muted-foreground">
                {h.reasonDescription || 'No reason specified'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
