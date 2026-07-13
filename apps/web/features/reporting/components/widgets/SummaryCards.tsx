import * as React from 'react';
import { Building, DollarSign, Wrench } from 'lucide-react';
import { ReportingSummary } from '../../types';

interface SummaryCardsProps {
  summary: ReportingSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cardData = [
    {
      title: 'Occupancy Rate',
      value: `${summary.occupancyRate}%`,
      description: `${summary.occupiedUnits} of ${summary.totalUnits} Units leased`,
      icon: Building,
      colorClass: 'text-blue-500 bg-blue-500/10',
    },
    {
      title: 'Total Receipts (Rent)',
      value: `₹${summary.totalPaid.toLocaleString()}`,
      description: `Collection rate: ${summary.collectionRate}%`,
      icon: DollarSign,
      colorClass: 'text-green-500 bg-green-500/10',
    },
    {
      title: 'Outstanding Balance',
      value: `₹${summary.outstandingBalance.toLocaleString()}`,
      description: `Remaining to collect`,
      icon: DollarSign,
      colorClass: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'Maintenance Issues',
      value: `${summary.openWorkOrders}`,
      description: `${summary.emergencyWorkOrders} Emergency priorities`,
      icon: Wrench,
      colorClass: summary.emergencyWorkOrders > 0 ? 'text-red-500 bg-red-500/10 animate-pulse' : 'text-zinc-500 bg-zinc-500/10',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cardData.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="p-6 bg-card border border-border rounded-xl shadow-sm flex items-center justify-between hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-primary focus-within:outline-hidden"
            tabIndex={0}
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.title}</span>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </div>
            <div className={`p-3 rounded-full ${card.colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
