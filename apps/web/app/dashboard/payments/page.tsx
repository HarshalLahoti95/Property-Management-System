'use client';
import * as React from 'react';
import { usePayments, PaymentTable } from '@/features/payment';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState('paymentDate');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const queryFilters: Record<string, unknown> = {
    page,
    limit: 10,
    sortBy,
    sortOrder,
  };
  if (statusFilter) queryFilters.status = statusFilter;

  const { data, isLoading } = usePayments(queryFilters);
  const payments = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const isTenant = user?.role === 'TENANT';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Payment History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and audit transaction payments submitted to property ledgers.
          </p>
        </div>
        {(isTenant || isAdmin) && (
          <Link href="/dashboard/payments/new">
            <Button>Submit Payment</Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg flex-wrap">
        <div className="space-y-1">
          <label htmlFor="payment-filter-status" className="text-xs font-semibold text-muted-foreground uppercase">
            Filter Status
          </label>
          <select
            id="payment-filter-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 h-9 rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CLEARED">Cleared</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border p-6 rounded-lg space-y-4 shadow-sm">
        <PaymentTable
          payments={payments}
          loading={isLoading}
          page={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />
      </div>
    </div>
  );
}
