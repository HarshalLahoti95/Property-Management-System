import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface OutstandingBalanceCardProps {
  balance: number;
  showPayButton?: boolean;
}

export function OutstandingBalanceCard({
  balance,
  showPayButton = false,
}: OutstandingBalanceCardProps) {
  const hasOutstanding = balance > 0;
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm flex items-center justify-between">
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Outstanding Charges</h3>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold tracking-tight ${hasOutstanding ? 'text-destructive' : 'text-foreground'}`}>
            ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {hasOutstanding && (
            <span className="text-xs font-semibold text-destructive px-1.5 py-0.5 rounded-full bg-destructive/10">
              Unpaid
            </span>
          )}
        </div>
      </div>
      <div>
        {showPayButton && hasOutstanding && (
          <Link href="/dashboard/payments/new">
            <Button className="flex items-center gap-1.5">
              Submit Payment <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
