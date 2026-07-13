'use client';
import * as React from 'react';
import { UserPreference } from '../types';
import { PreferenceFormValues } from '../schemas';
import { Mail, MessageSquare, Bell, Award, CheckCircle } from 'lucide-react';

interface PreferenceFormProps {
  preferences: UserPreference;
  onToggle: (field: keyof PreferenceFormValues, value: boolean) => void;
  submitting?: boolean;
}

export function PreferenceForm({
  preferences,
  onToggle,
  submitting = false,
}: PreferenceFormProps) {
  const handleSwitchChange = (field: keyof PreferenceFormValues) => {
    onToggle(field, !preferences[field]);
  };

  const toggleItems: {
    key: keyof PreferenceFormValues;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'emailEnabled',
      label: 'Email Notifications',
      description: 'Receive critical account activities, invoices, and lease updates via email.',
      icon: <Mail className="h-5 w-5 text-primary" />,
    },
    {
      key: 'smsEnabled',
      label: 'SMS Text Messages',
      description: 'Get immediate text alerts for emergency work orders and payment due reminders.',
      icon: <MessageSquare className="h-5 w-5 text-primary" />,
    },
    {
      key: 'pushEnabled',
      label: 'Browser Push Notifications',
      description: 'Enable real-time push alerts within this browser dashboard context.',
      icon: <Bell className="h-5 w-5 text-primary" />,
    },
    {
      key: 'marketingEmailsEnabled',
      label: 'Marketing & Announcements',
      description: 'Opt-in to newsletter updates, property reviews, and local neighborhood listings.',
      icon: <Award className="h-5 w-5 text-primary" />,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-6 max-w-xl">
      <div className="border-b border-border pb-4">
        <h3 className="text-lg font-bold text-foreground">Global Preferences</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage how and when you want to receive notification updates from the platform.
        </p>
      </div>

      <div className="space-y-4 divide-y divide-border/60">
        {toggleItems.map((item, idx) => {
          const isChecked = !!preferences[item.key];
          return (
            <div
              key={item.key}
              className={`flex items-start justify-between gap-4 py-4 ${
                idx === 0 ? 'pt-0' : ''
              }`}
            >
              <div className="flex gap-3">
                <div className="mt-1 shrink-0">{item.icon}</div>
                <div>
                  <label
                    htmlFor={`preference-switch-${item.key}`}
                    className="text-sm font-semibold text-foreground cursor-pointer"
                  >
                    {item.label}
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Styled Switch Toggle */}
              <div className="relative inline-flex items-center mt-1">
                <input
                  type="checkbox"
                  id={`preference-switch-${item.key}`}
                  checked={isChecked}
                  disabled={submitting}
                  onChange={() => handleSwitchChange(item.key)}
                  className="sr-only peer"
                />
                <div
                  onClick={() => !submitting && handleSwitchChange(item.key)}
                  className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary cursor-pointer"
                />
              </div>
            </div>
          );
        })}
      </div>

      {submitting && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold justify-end animate-pulse">
          <CheckCircle className="h-4 w-4 text-primary" />
          <span>Saving updates...</span>
        </div>
      )}
    </div>
  );
}
