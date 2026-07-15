'use client';
import * as React from 'react';
import { useLeases } from '@/features/lease';
import { 
  useLeaseDisbursementSummary, 
  useCreateDisbursement,
  CreateDisbursementDialog,
  DisbursementHistoryTable
} from '@/features/disbursement';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

export default function DisbursementsPage() {
  const { data: leasesData, isLoading: leasesLoading } = useLeases({ limit: 100 });
  const leases: any[] = Array.isArray(leasesData) ? leasesData : (leasesData as any)?.data || [];
  
  const [selectedLeaseId, setSelectedLeaseId] = React.useState<string>('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { addToast } = useToast();

  const { data: summary, isLoading: summaryLoading } = useLeaseDisbursementSummary(selectedLeaseId);
  const { mutateAsync: createDisbursement, isPending: submitting } = useCreateDisbursement();

  const handleCreate = async (values: { amount: number; referenceNote?: string }) => {
    if (!selectedLeaseId) return;
    try {
      await createDisbursement({
        leaseId: selectedLeaseId,
        amount: values.amount,
        referenceNote: values.referenceNote,
      });
      addToast({ title: 'Success', description: 'Disbursement recorded successfully', variant: 'success' });
      setDialogOpen(false);
    } catch (err: any) {
      addToast({ title: 'Error', description: err?.response?.data?.message || err.message || 'Failed to record disbursement', variant: 'error' });
    }
  };

  const currentAmountOwed = summary ? parseFloat(summary.currentAmountOwed) : 0;
  const trustLedgerBalance = summary ? parseFloat(summary.trustLedgerBalance) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Disbursements</h1>
        <p className="text-muted-foreground text-sm">
          Manage and record manual payouts to landlords from property trust accounts.
        </p>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border shadow-sm max-w-md">
        <label htmlFor="lease-select" className="block text-sm font-semibold text-foreground mb-2">
          Select Lease
        </label>
        <select
          id="lease-select"
          className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-ring"
          value={selectedLeaseId}
          onChange={(e) => setSelectedLeaseId(e.target.value)}
          disabled={leasesLoading}
        >
          <option value="">-- Select a Lease --</option>
          {leases.map((lease: any) => (
            <option key={lease.id} value={lease.id}>
              {lease.unit?.property?.name ? `${lease.unit.property.name} - Unit ${lease.unit.unitNumber}` : lease.id}
            </option>
          ))}
        </select>
      </div>

      {selectedLeaseId && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Amount Owed</h3>
              <p className="text-3xl font-bold text-foreground">
                {summaryLoading ? '...' : `₹${currentAmountOwed.toFixed(2)}`}
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Trust Ledger Balance</h3>
                <p className="text-3xl font-bold text-foreground">
                  {summaryLoading ? '...' : `₹${trustLedgerBalance.toFixed(2)}`}
                </p>
              </div>
              <Button 
                onClick={() => setDialogOpen(true)}
                disabled={summaryLoading || trustLedgerBalance <= 0}
              >
                Create Disbursement
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Disbursement History</h2>
            </div>
            <div className="p-0">
              <DisbursementHistoryTable 
                disbursements={summary?.disbursements || []} 
                loading={summaryLoading} 
              />
            </div>
          </div>

          <CreateDisbursementDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSubmit={handleCreate}
            submitting={submitting}
            currentAmountOwed={currentAmountOwed}
            trustLedgerBalance={trustLedgerBalance}
          />
        </div>
      )}
    </div>
  );
}
