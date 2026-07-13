/* eslint-disable */
'use client';
import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useWorkOrder,
  useTransitionWorkOrderStatus,
  useAssignWorkOrderVendor,
  useCreateWorkOrderComment,
  WorkOrderCard,
  CostSummaryCard,
  CommentTimeline,
  HistoryTimeline,
  VendorAssignmentDialog,
  StatusTransitionDialog,
} from '@/features/maintenance';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: workOrder, isLoading, refetch } = useWorkOrder(id);
  const transitionMutation = useTransitionWorkOrderStatus(id);
  const assignVendorMutation = useAssignWorkOrderVendor(id);
  const createCommentMutation = useCreateWorkOrderComment(id);

  const [vendorDialogOpen, setVendorDialogOpen] = React.useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary animate-pulse rounded-md" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 h-96 bg-secondary animate-pulse rounded-md" />
          <div className="h-48 bg-secondary animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5 text-center space-y-4 max-w-lg mx-auto my-12">
        <h3 className="text-lg font-bold text-destructive">Work order not found</h3>
        <p className="text-sm text-muted-foreground">
          The requested maintenance record does not exist or you lack authorization.
        </p>
        <Link href="/dashboard/maintenance">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>
    );
  }

  const handleAssignVendor = (values: any) => {
    assignVendorMutation.mutate(values, {
      onSuccess: () => {
        setVendorDialogOpen(false);
      },
    });
  };

  const handleTransitionStatus = (values: any) => {
    transitionMutation.mutate(values, {
      onSuccess: () => {
        setStatusDialogOpen(false);
      },
    });
  };

  const handleAddComment = (values: any) => {
    createCommentMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/maintenance">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Manage Work Order
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column */}
        <div className="md:col-span-2 space-y-6">
          <WorkOrderCard
            workOrder={workOrder}
            onAssignVendorClick={() => setVendorDialogOpen(true)}
            onTransitionStatusClick={() => setStatusDialogOpen(true)}
          />

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <CommentTimeline
              comments={workOrder.comments || []}
              onAddComment={handleAddComment}
              submitting={createCommentMutation.isPending}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <CostSummaryCard workOrder={workOrder} />

          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <HistoryTimeline history={workOrder.statusHistory || []} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <VendorAssignmentDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        onSubmit={handleAssignVendor}
        submitting={assignVendorMutation.isPending}
        currentVendorId={workOrder.vendorId}
      />

      <StatusTransitionDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        onSubmit={handleTransitionStatus}
        submitting={transitionMutation.isPending}
        currentStatus={workOrder.status}
      />
    </div>
  );
}
