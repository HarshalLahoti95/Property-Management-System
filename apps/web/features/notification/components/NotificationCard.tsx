import * as React from 'react';
import { NotificationHistory } from '../types';
import { NotificationStatusBadge } from './NotificationStatusBadge';
import { Mail, Clock, ShieldAlert, Cpu } from 'lucide-react';

export function NotificationCard({ notification }: { notification: NotificationHistory }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border pb-4 flex-wrap gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5 rounded-md">
              Log: {notification.id.substring(0, 8)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Template: {notification.template}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground mt-1">{notification.subject}</h2>
        </div>
        <div className="flex items-center gap-2">
          <NotificationStatusBadge status={notification.status} />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Recipient</p>
            <p className="text-sm font-medium text-foreground">{notification.recipient}</p>
            {notification.user && (
              <p className="text-xs text-muted-foreground">User: {notification.user.fullName}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Dispatched Date</p>
            <p className="text-sm font-medium text-foreground">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Cpu className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Provider & Transport</p>
            <p className="text-sm font-medium text-foreground capitalize">
              {notification.provider} SMTP
            </p>
            <p className="text-xs text-muted-foreground">Retry count: {notification.retryCount}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Delivery Result</p>
            <p className="text-sm font-medium text-foreground">
              {notification.deliveryResult || 'Successful transaction.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
