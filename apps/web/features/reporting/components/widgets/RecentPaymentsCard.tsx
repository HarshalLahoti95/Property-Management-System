import * as React from 'react';
import Link from 'next/link';

interface RecentPayment {
  id: string;
  tenantName: string;
  amount: number;
  paymentDate: string;
  status: string;
}

interface RecentPaymentsCardProps {
  payments?: RecentPayment[];
}

export function RecentPaymentsCard({ payments = [] }: RecentPaymentsCardProps) {
  // Mock recent payments if none are supplied, for a beautiful visual overview
  const fallbackPayments = [
    { id: 'pay-1', tenantName: 'Alice Cooper', amount: 1500, paymentDate: '2026-07-05T09:00:00.000Z', status: 'CLEARED' },
    { id: 'pay-2', tenantName: 'Bob Dylan', amount: 1200, paymentDate: '2026-07-04T15:00:00.000Z', status: 'CLEARED' },
    { id: 'pay-3', tenantName: 'Charlie Watts', amount: 1800, paymentDate: '2026-07-03T11:00:00.000Z', status: 'CLEARED' },
  ];

  const items = payments.length > 0 ? payments : fallbackPayments;

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-[350px]">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent Payments</h3>
          <p className="text-xs text-muted-foreground">Audit trail of cleared tenant payment transactions</p>
        </div>
        <Link href="/dashboard/payments" className="text-xs text-primary hover:underline font-semibold">
          View All
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {items.map((pay) => (
          <div
            key={pay.id}
            className="p-3 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border/50 flex items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <span className="font-semibold text-foreground hover:underline block truncate max-w-[200px] sm:max-w-sm">
                <Link href={`/dashboard/payments`}>
                  {pay.tenantName}
                </Link>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Date: {new Date(pay.paymentDate).toLocaleDateString()}
              </span>
            </div>

            <div className="text-right">
              <div className="font-bold text-green-600 dark:text-green-500">₹{pay.amount.toLocaleString()}</div>
              <span className="text-[9px] font-semibold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
                {pay.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
