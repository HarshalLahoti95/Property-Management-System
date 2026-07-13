'use client';
import * as React from 'react';
import { useLeases, useDeleteLease, LeaseTable } from '@/features/lease';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function LeasesPage() {
  const [statusFilter, setStatusFilter] = React.useState('');
  const { data: leases = [], isLoading } = useLeases(statusFilter ? { status: statusFilter } : {});
  const deleteLeaseMutation = useDeleteLease();
  const { user } = useAuth();

  const handleDelete = (id: string) => {
    deleteLeaseMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Lease Agreements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track tenant lease contracts and signatures.
          </p>
        </div>
        {user?.role !== 'TENANT' && (
          <Link href="/dashboard/leases/new">
            <Button variant="default">Create Draft Lease</Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_LANDLORD_APPROVAL">Pending Landlord Approval</option>
          <option value="PENDING_TENANT_SIGNATURE">Pending Tenant Signature</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_TERMINATION_APPROVAL">Pending Termination</option>
          <option value="EXPIRED">Expired</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      <LeaseTable leases={leases} loading={isLoading} onDelete={handleDelete} />
    </div>
  );
}
