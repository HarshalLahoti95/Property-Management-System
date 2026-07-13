'use client';
import * as React from 'react';
import { useLeases } from '@/features/lease';
import {
  useCharges,
  useCreateCharge,
  ChargeTable,
  ChargeForm,
  ChargeDetailsDialog,
  RentCharge,
} from '@/features/accounting';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function ChargesPage() {
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState('dueDate');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedCharge, setSelectedCharge] = React.useState<RentCharge | null>(null);

  const { data: leases = [] } = useLeases();
  
  const queryFilters: Record<string, unknown> = {
    page,
    limit: 10,
    sortBy,
    sortOrder,
  };
  if (statusFilter) queryFilters.status = statusFilter;
  if (typeFilter) queryFilters.type = typeFilter;

  const { data, isLoading } = useCharges(queryFilters);
  const charges = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  const createMutation = useCreateCharge();

  const handleCreateCharge = (values: import('@/features/accounting').ChargeFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setCreateOpen(false);
      },
    });
  };

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Charge Agreements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and create outstanding tenant financial ledger charges.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create One-Time Charge</Button>
      </div>

      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg flex-wrap">
        <div className="space-y-1">
          <label htmlFor="filter-status" className="text-xs font-semibold text-muted-foreground uppercase">
            Filter Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 h-9 rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-type" className="text-xs font-semibold text-muted-foreground uppercase">
            Filter Category
          </label>
          <select
            id="filter-type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 h-9 rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="RENT">Rent</option>
            <option value="SECURITY_DEPOSIT">Security Deposit</option>
            <option value="LATE_FEE">Late Fee</option>
            <option value="UTILITY">Utility</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="MISC">Miscellaneous</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-lg space-y-4 shadow-sm">
        <ChargeTable
          charges={charges}
          loading={isLoading}
          page={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onSelectCharge={setSelectedCharge}
        />
      </div>

      {createOpen && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Ledger Charge</DialogTitle>
              <DialogDescription>
                Submit a one-time utility bill, late fee, or manual charge ledger entry.
              </DialogDescription>
            </DialogHeader>
            <div className="pt-2">
              <ChargeForm
                leases={leases}
                onSubmit={handleCreateCharge}
                submitting={createMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedCharge && (
        <ChargeDetailsDialog
          charge={selectedCharge}
          open={!!selectedCharge}
          onOpenChange={(open) => {
            if (!open) setSelectedCharge(null);
          }}
        />
      )}
    </div>
  );
}
