'use client';
import * as React from 'react';
import { useCreateLease, LeaseForm } from '@/features/lease';
import { useRouter } from 'next/navigation';

export default function NewLeasePage() {
  const router = useRouter();
  const createLeaseMutation = useCreateLease();

  const handleSubmit = (values: any) => {
    createLeaseMutation.mutate(values, {
      onSuccess: () => {
        router.push('/dashboard/leases');
      },
      onError: (err: any) => {
        alert(err.message || 'Lease creation failed');
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Draft Lease</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Draft a new lease contract parameter set.
        </p>
      </div>

      <LeaseForm onSubmit={handleSubmit} />
    </div>
  );
}
