'use client';
import * as React from 'react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  PreferenceForm,
} from '@/features/notification';
import { Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationPreferencesPage() {
  const { data: preferences, isLoading, refetch } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-secondary animate-pulse rounded-md" />
        <div className="h-96 max-w-xl bg-secondary animate-pulse rounded-md" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5 text-center space-y-4 max-w-lg mx-auto my-12">
        <h3 className="text-lg font-bold text-destructive">Preferences not found</h3>
        <p className="text-sm text-muted-foreground">
          Could not fetch preference configuration profile.
        </p>
      </div>
    );
  }

  const handleToggle = (
    field: 'emailEnabled' | 'smsEnabled' | 'pushEnabled' | 'marketingEmailsEnabled',
    value: boolean
  ) => {
    updateMutation.mutate({
      emailEnabled: preferences.emailEnabled,
      smsEnabled: preferences.smsEnabled,
      pushEnabled: preferences.pushEnabled,
      marketingEmailsEnabled: preferences.marketingEmailsEnabled,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" /> Notification Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure preference delivery options for mail lists, text SMS alerts, and announcements.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-w-xl">
        <PreferenceForm
          preferences={preferences}
          onToggle={handleToggle}
          submitting={updateMutation.isPending}
        />
      </div>
    </div>
  );
}
