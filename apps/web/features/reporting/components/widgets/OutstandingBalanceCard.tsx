import * as React from 'react';
import { AlertCircle } from 'lucide-react';

interface OutstandingBalanceCardProps {
  outstandingBalance: number;
  collectionRate: number;
}

export function OutstandingBalanceCard({
  outstandingBalance,
  collectionRate,
}: OutstandingBalanceCardProps) {

  // Mock outstanding list to fill detailed administrative dashboard breakdown
  const mockOutstandingList = [
    { tenant: 'John Doe', unit: 'Apt 101', amount: 1200, daysPastDue: 5 },
    { tenant: 'Jane Smith', unit: 'Apt 204', amount: 850, daysPastDue: 12 },
    { tenant: 'Michael Brown', unit: 'Unit B', amount: 1500, daysPastDue: 2 },
  ];

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col h-[350px]">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Outstanding Accounts Breakdown</h3>
        <p className="text-xs text-muted-foreground">Detailed view of uncollected rental balances</p>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
        <div className="text-xs text-amber-800 dark:text-amber-400">
          Total outstanding balance: <span className="font-bold">₹{outstandingBalance.toLocaleString()}</span>. 
          Overall collection rate is {collectionRate}%.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {outstandingBalance === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground text-xs">
            All balances have been fully collected and settled.
          </div>
        ) : (
          mockOutstandingList.map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border/50 flex justify-between items-center text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground">{item.tenant}</span>
                <div className="text-[10px] text-muted-foreground">
                  {item.unit} • {item.daysPastDue} days past due
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-destructive">₹{item.amount.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
