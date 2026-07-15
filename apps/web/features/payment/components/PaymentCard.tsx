'use client';
import * as React from 'react';
import { Payment } from '../types';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { RefundDialog } from './RefundDialog';
import { useRefundPayment } from '../hooks/use-payment';

export function PaymentCard({ payment }: { payment: Payment }) {
  const { user } = useAuth();
  const refundMutation = useRefundPayment(payment.id);
  const [refundOpen, setRefundOpen] = React.useState(false);

  const isLandlord = user?.role === 'LANDLORD';
  const isLandlordOrAdmin = user?.role === 'ADMIN' || isLandlord;
  const isRefundable = payment.status === 'CLEARED';

  const handleRefundSubmit = (values: { amount?: number; reason: string }) => {
    refundMutation.mutate(values, {
      onSuccess: () => {
        setRefundOpen(false);
      },
    });
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h4 className="font-semibold text-lg text-foreground">Payment Details</h4>
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
              ID: {payment.id}
            </p>
          </div>
          <PaymentStatusBadge status={payment.status} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Amount</p>
            <p className="text-xl font-bold text-foreground mt-1">
              ₹{Number(payment.amount).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Method</p>
            <div className="mt-1">
              <PaymentMethodBadge method={payment.paymentMethod} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Reference ID</p>
            <p className="text-sm font-medium mt-1">{payment.transactionReference}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Processed Date</p>
            <p className="text-sm font-medium mt-1">
              {new Date(payment.paymentDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Tenant Info</p>
          <div className="text-sm">
            <p className="font-semibold text-foreground">{payment.tenant?.fullName || 'Tenant User'}</p>
            <p className="text-muted-foreground text-xs">{payment.tenant?.email || 'N/A'}</p>
          </div>
        </div>

        {isLandlordOrAdmin && isRefundable && (
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="destructive"
              onClick={() => setRefundOpen(true)}
              disabled
              title="Refunds are temporarily disabled in v1 while the accounting service is upgraded."
            >
              Issue Refund
            </Button>
          </div>
        )}
      </div>

      {refundOpen && (
        <RefundDialog
          open={refundOpen}
          onOpenChange={setRefundOpen}
          onSubmit={handleRefundSubmit}
          submitting={refundMutation.isPending}
          maxAmount={Number(payment.amount)}
        />
      )}
    </>
  );
}
