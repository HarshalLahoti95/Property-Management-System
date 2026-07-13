'use client';
import * as React from 'react';
import { useLeases } from '@/features/lease/hooks/use-lease';
import { usePayments } from '@/features/payment/hooks/use-payment';
import { useWorkOrders } from '@/features/maintenance/hooks/use-maintenance';
import { useDocuments } from '@/features/document/hooks/use-document';
import { Lease } from '@/features/lease/types';
import { Document } from '@/features/document/types';
import { CreditCard, Wrench, Folder, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLeaseSummary } from '@/features/accounting/hooks/use-accounting';

export function TenantDashboard() {
  const { data: leasesRes, isLoading: leasesLoading } = useLeases();
  const { data: paymentsRes, isLoading: paymentsLoading } = usePayments();
  const { data: workOrdersRes, isLoading: workOrdersLoading } = useWorkOrders();
  const { data: documentsRes, isLoading: documentsLoading } = useDocuments();

  if (leasesLoading || paymentsLoading || workOrdersLoading || documentsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/4 mb-4" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-44 bg-card border border-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Extract relevant tenant models
  const leases = (leasesRes || []) as Lease[];
  const activeLease = leases.find((l) => l.status === 'ACTIVE');
  const payments = paymentsRes?.data || [];
  const workOrders = workOrdersRes?.data || [];
  const documents = (documentsRes?.data || []) as Document[];

  // Fetch actual outstanding balance summary dynamically
  const { data: leaseSummary } = useLeaseSummary(activeLease?.id || '');
  const outstandingSum = leaseSummary?.outstandingCharges.reduce((sum, c) => sum + c.amount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Tenant Portal</h1>
        <p className="text-sm text-muted-foreground">Manage your rent payments and maintenance requests</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Lease Summary Widget */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Active Lease Summary
              </h3>
              <p className="text-xs text-muted-foreground">Terms and property location details</p>
            </div>
            {activeLease && (
              <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold text-green-600 bg-green-500/10 border-green-500/20 uppercase">
                Active
              </span>
            )}
          </div>

          {activeLease ? (
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Property Location:</span>
                <span className="font-semibold text-foreground">
                  {activeLease.unit.property.name} — Unit {activeLease.unit.unitNumber}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Monthly Rent Rate:</span>
                <span className="font-bold text-foreground">
                  ₹{Number(activeLease.monthlyRent).toLocaleString()} /mo
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Lease Term:</span>
                <span className="font-semibold text-foreground">
                  {new Date(activeLease.startDate).toLocaleDateString()} to {new Date(activeLease.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-6 text-center">
              No active lease agreement found. Contact your landlord.
            </div>
          )}

          <div className="pt-4 border-t border-border/40 flex justify-end">
            {activeLease && (
              <Link href={`/dashboard/leases/${activeLease.id}`}>
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
                  Inspect Agreement <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Rent Payments Status Widget */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Rental Payment Status
            </h3>
            <p className="text-xs text-muted-foreground">Current monthly payment balance due</p>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span className="text-muted-foreground">Outstanding charges:</span>
              <span className={`font-bold ${outstandingSum > 0 ? 'text-destructive' : 'text-foreground'}`}>
                ₹{outstandingSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-muted-foreground">Recent Transaction:</span>
              <span className="font-semibold text-foreground">
                {payments.length > 0
                  ? `₹${payments[0].amount.toLocaleString()} on ${new Date(payments[0].paymentDate).toLocaleDateString()}`
                  : 'No payment records logged'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex justify-end gap-2">
            <Link href="/dashboard/payments">
              <Button variant="outline" size="sm" className="text-xs">
                History
              </Button>
            </Link>
            <Link href="/dashboard/payments/new">
              <Button size="sm" className="text-xs">
                Submit Payment
              </Button>
            </Link>
          </div>
        </div>

        {/* Maintenance Requests Widget */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
          <div className="mb-4 flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" /> Active Maintenance Requests
              </h3>
              <p className="text-xs text-muted-foreground">Overview of your submitted issues</p>
            </div>
            <Link href="/dashboard/maintenance" className="text-xs text-primary hover:underline font-semibold">
              View All
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[140px] pr-1">
            {workOrders.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                No active maintenance requests submitted.
              </div>
            ) : (
              workOrders.slice(0, 3).map((wo) => (
                <div
                  key={wo.id}
                  className="p-2.5 bg-muted/40 rounded-lg border border-border/50 flex justify-between items-center text-xs gap-3"
                >
                  <span className="font-medium text-foreground truncate max-w-[200px] hover:underline">
                    <Link href={`/dashboard/maintenance/${wo.id}`}>{wo.title}</Link>
                  </span>
                  <span className="px-2 py-0.5 rounded-full border text-[10px] font-semibold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 uppercase">
                    {wo.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-border/40 flex justify-end">
            <Link href="/dashboard/maintenance/new">
              <Button size="sm" className="text-xs flex items-center gap-1.5">
                Submit Request <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Documents Folders Widget */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[200px]">
          <div className="mb-4 flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Folder className="w-4 h-4 text-primary" /> Shared Documents
              </h3>
              <p className="text-xs text-muted-foreground">Recent lease contracts and reports uploaded</p>
            </div>
            <Link href="/dashboard/documents" className="text-xs text-primary hover:underline font-semibold">
              View All
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[140px] pr-1">
            {documents.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                No documents shared in repository.
              </div>
            ) : (
              documents.slice(0, 3).map((doc) => (
                <div
                  key={doc.id}
                  className="p-2.5 bg-muted/40 rounded-lg border border-border/50 flex justify-between items-center text-xs gap-3"
                >
                  <span className="font-medium text-foreground truncate max-w-[200px] hover:underline">
                    <Link href={`/dashboard/documents/${doc.id}`}>{doc.fileName}</Link>
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {doc.category}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
