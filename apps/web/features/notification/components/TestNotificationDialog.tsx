'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { testNotificationSchema, TestNotificationFormValues } from '../schemas';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TestNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TestNotificationFormValues) => void;
  submitting?: boolean;
}

export function TestNotificationDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
}: TestNotificationDialogProps) {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TestNotificationFormValues>({
    resolver: zodResolver(testNotificationSchema),
    defaultValues: {
      email: '',
    },
  });

  React.useEffect(() => {
    if (open && user?.email) {
      setValue('email', user.email);
    }
  }, [open, user, setValue]);

  // Restrict rendering to ADMIN at the component level
  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Test SMTP Notification</DialogTitle>
          <DialogDescription>
            Dispatch a mock email directly from the mail carrier gateway to check connectivity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Email input */}
          <div className="space-y-1">
            <label htmlFor="test-recipient-email" className="text-sm font-semibold text-foreground">
              Recipient Email Address
            </label>
            <Input
              id="test-recipient-email"
              placeholder="e.g. admin@domain.com"
              {...register('email')}
              disabled={submitting}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs font-semibold text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Dispatching...' : 'Send Test Mail'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
