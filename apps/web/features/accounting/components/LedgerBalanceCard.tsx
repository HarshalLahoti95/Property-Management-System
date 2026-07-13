import * as React from 'react';
import { DollarSign } from 'lucide-react';

interface LedgerBalanceCardProps {
  title: string;
  balance: number;
  type: 'operating' | 'trust';
  description?: string;
}

export function LedgerBalanceCard({
  title,
  balance,
  type,
  description,
}: LedgerBalanceCardProps) {
  const isOperating = type === 'operating';
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium tracking-tight text-muted-foreground">{title}</h3>
        <DollarSign className={`h-4 w-4 ${isOperating ? 'text-primary' : 'text-emerald-500'}`} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold tracking-tight">
          ${Number(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
