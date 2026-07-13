'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { attachDocumentSchema, AttachDocumentFormValues } from '../schemas';
import { DocumentAttachment } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Trash2 } from 'lucide-react';

interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AttachDocumentFormValues) => void;
  onDetach?: (values: AttachDocumentFormValues) => void;
  submitting?: boolean;
  attachments?: DocumentAttachment[];
}

export function AttachmentDialog({
  open,
  onOpenChange,
  onSubmit,
  onDetach,
  submitting = false,
  attachments = [],
}: AttachmentDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AttachDocumentFormValues>({
    resolver: zodResolver(attachDocumentSchema),
    defaultValues: {
      entityType: 'LEASE',
      entityId: '',
    },
  });

  const handleFormSubmit = (values: AttachDocumentFormValues) => {
    onSubmit(values);
    reset({ entityType: values.entityType, entityId: '' });
  };

  React.useEffect(() => {
    if (open) {
      reset({ entityType: 'LEASE', entityId: '' });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Document Attachment</DialogTitle>
          <DialogDescription>
            Attach this file to a lease agreement, maintenance order, tenant, or payment record.
          </DialogDescription>
        </DialogHeader>

        {/* List of active attachments */}
        <div className="space-y-2 max-h-[160px] overflow-y-auto pt-2 border-b border-border pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
            <Link className="h-3.5 w-3.5" /> Linked Attachments ({attachments.length})
          </p>
          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No linked attachments for this file.</p>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border border-border/60 bg-muted/10 p-2 rounded-md text-xs"
                >
                  <div>
                    <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded-sm uppercase mr-1">
                      {a.entityType.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-muted-foreground truncate max-w-[120px] inline-block align-bottom">
                      {a.entityId}
                    </span>
                  </div>
                  {onDetach && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onDetach({ entityType: a.entityType, entityId: a.entityId })
                      }
                      disabled={submitting}
                      className="h-6 px-1.5 text-destructive hover:bg-destructive/10 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Detach
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add link form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Entity Type selection */}
            <div className="space-y-1">
              <label htmlFor="attach-type" className="text-sm font-semibold text-foreground">
                Link Entity Type
              </label>
              <select
                id="attach-type"
                {...register('entityType')}
                className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="LEASE">Lease Agreement</option>
                <option value="USER">User / Tenant</option>
                <option value="WORK_ORDER">Work Order / Maintenance</option>
                <option value="PAYMENT">Payment Transaction</option>
              </select>
              {errors.entityType && (
                <p className="text-xs font-semibold text-destructive">{errors.entityType.message}</p>
              )}
            </div>

            {/* Target ID input */}
            <div className="space-y-1">
              <label htmlFor="attach-uuid" className="text-sm font-semibold text-foreground">
                Target Entity ID (UUID)
              </label>
              <Input
                id="attach-uuid"
                placeholder="e.g. uuid-here"
                {...register('entityId')}
                aria-invalid={!!errors.entityId}
              />
              {errors.entityId && (
                <p className="text-xs font-semibold text-destructive">{errors.entityId.message}</p>
              )}
            </div>
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
              {submitting ? 'Linking...' : 'Link Attachment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
