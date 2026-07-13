'use client';
import * as React from 'react';
import { use } from 'react';
import { useLease, useUpdateLease, LeaseForm } from '@/features/lease';
import { useRouter } from 'next/navigation';

export default function EditLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const { data: lease, isLoading, error } = useLease(id);
  const updateLeaseMutation = useUpdateLease(id);

  if (isLoading) {
    return <div className="h-40 w-full bg-secondary animate-pulse rounded-md" />;
  }

  if (error || !lease) {
    return <p className="text-destructive">Failed to fetch lease details.</p>;
  }

  const handleSubmit = (values: any) => {
    updateLeaseMutation.mutate(values, {
      onSuccess: () => {
        router.push(`/dashboard/leases/${id}`);
      },
      onError: (err: any) => {
        alert(err.message || 'Lease update failed');
      },
    });
  };

  const formatValues = {
    unitId: lease.unitId,
    startDate: new Date(lease.startDate).toISOString().slice(0, 10),
    endDate: new Date(lease.endDate).toISOString().slice(0, 10),
    monthlyRent: Number(lease.monthlyRent),
    securityDeposit: Number(lease.securityDeposit),
    rentDueDay: lease.rentDueDay,
    gracePeriodDays: lease.gracePeriodDays,
    tenantIds: lease.leaseTenants.map((lt: any) => lt.tenantId),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Draft Lease</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modify draft contract parameters before requesting signatures.
        </p>
      </div>

      <LeaseForm defaultValues={formatValues} onSubmit={handleSubmit} submitLabel="Update Lease" />
    </div>
  );
}
