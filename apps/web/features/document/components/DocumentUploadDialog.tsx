'use client';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { uploadDocumentSchema, UploadDocumentFormValues } from '../schemas';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { file: File; category: string }) => void;
  submitting?: boolean;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting = false,
}: DocumentUploadDialogProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UploadDocumentFormValues>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      category: 'OTHER',
    },
  });

  const handleFormSubmit = (values: UploadDocumentFormValues) => {
    if (!selectedFile) {
      setFileError('Please select a file to upload.');
      return;
    }
    onSubmit({ file: selectedFile, category: values.category });
  };

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFile(null);
      setFileError(null);
      reset({ category: 'OTHER' });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Choose a file and categorize it to keep your property digital archives organized.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
          {/* Category Dropdown */}
          <div className="space-y-1">
            <label htmlFor="upload-category" className="text-sm font-semibold text-foreground">
              Document Category
            </label>
            <select
              id="upload-category"
              {...register('category')}
              className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
            >
              <option value="LEASE_AGREEMENT">Lease Agreement</option>
              <option value="GOVERNMENT_ID">Government ID / Identification</option>
              <option value="INVOICE">Invoice</option>
              <option value="RECEIPT">Receipt</option>
              <option value="DAMAGE_PHOTO">Damage Photo / Asset Condition</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.category && (
              <p className="text-xs font-semibold text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Shared FileUpload */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground">File Attachment</label>
            <FileUpload
              onFileSelect={(file) => {
                setSelectedFile(file);
                if (file) setFileError(null);
              }}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
              maxSizeMB={10}
              loading={submitting}
            />
            {fileError && <p className="text-xs font-semibold text-destructive">{fileError}</p>}
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
              {submitting ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
