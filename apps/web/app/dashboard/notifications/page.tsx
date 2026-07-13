'use client';
import * as React from 'react';
import { useNotifications, useSendTestNotification } from '@/features/notification';
import { NotificationHistoryTable, TestNotificationDialog } from '@/features/notification';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Bell, Send, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsHistoryPage() {
  const [page, setPage] = React.useState(1);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, refetch } = useNotifications({
    page,
    limit: 10,
  });

  const testMutation = useSendTestNotification();
  const [testDialogOpen, setTestDialogOpen] = React.useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = React.useState<string | null>(null);

  const handleTestSubmit = (values: { email: string }) => {
    testMutation.mutate(values, {
      onSuccess: (res) => {
        setTestDialogOpen(false);
        setTestSuccessMessage(res.message || 'SMTP test mail dispatched successfully.');
        setTimeout(() => setTestSuccessMessage(null), 5000);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" /> Notifications Dispatch History
          </h1>
          <p className="text-sm text-muted-foreground">
            Audit outbound SMTP emails, delivery receipts, and verification logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/dashboard/settings/notifications">
            <Button variant="outline" size="sm" className="h-9">
              Preferences
            </Button>
          </Link>
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setTestDialogOpen(true)}
              className="h-9 flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" /> Send Test Email
            </Button>
          )}
        </div>
      </div>

      {testSuccessMessage && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-950 text-xs font-semibold rounded-md animate-fade-in">
          {testSuccessMessage}
        </div>
      )}

      {/* Table view */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <NotificationHistoryTable
          notifications={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || 1}
          onPageChange={setPage}
        />
      </div>

      {/* Admin SMTP test Dialog */}
      {isAdmin && (
        <TestNotificationDialog
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          onSubmit={handleTestSubmit}
          submitting={testMutation.isPending}
        />
      )}
    </div>
  );
}
