/* eslint-disable */
'use client';
import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useDocument,
  useDocumentHistory,
  useUploadDocumentVersion,
  useAttachDocument,
  useDetachDocument,
  DocumentCard,
  VersionHistory,
  DocumentHistoryTimeline,
  AttachmentDialog,
} from '@/features/document';
import { documentService } from '@/features/document/services/document.service';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ArrowLeft, RefreshCw, File } from 'lucide-react';
import Link from 'next/link';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: document, isLoading, refetch } = useDocument(id);
  const { data: history = [], refetch: refetchHistory } = useDocumentHistory(id);

  const uploadVersionMutation = useUploadDocumentVersion(id);
  const attachMutation = useAttachDocument(id);
  const detachMutation = useDetachDocument(id);

  const [attachDialogOpen, setAttachDialogOpen] = React.useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = React.useState(false);
  const [selectedVersionFile, setSelectedVersionFile] = React.useState<File | null>(null);
  const [versionFileError, setVersionFileError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

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

  if (!document) {
    return (
      <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5 text-center space-y-4 max-w-lg mx-auto my-12">
        <h3 className="text-lg font-bold text-destructive">Document not found</h3>
        <p className="text-sm text-muted-foreground">
          The requested document record does not exist or you lack authorization.
        </p>
        <Link href="/dashboard/documents">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>
    );
  }

  const handleAttachSubmit = (values: any) => {
    attachMutation.mutate(values, {
      onSuccess: () => {
        // Keep dialog open if they want to link multiple entities, but reset is handled in dialog
      },
    });
  };

  const handleDetachSubmit = (values: any) => {
    detachMutation.mutate(values);
  };

  const handleVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVersionFile) {
      setVersionFileError('Please select a file version.');
      return;
    }
    uploadVersionMutation.mutate(
      { file: selectedVersionFile },
      {
        onSuccess: () => {
          setVersionDialogOpen(false);
          setSelectedVersionFile(null);
          setVersionFileError(null);
        },
      }
    );
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document permanently?')) {
      return;
    }
    setDeleting(true);
    try {
      await documentService.deleteDocument(id);
      router.push('/dashboard/documents');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/documents">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Manage Document
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetch(); refetchHistory(); }}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column */}
        <div className="md:col-span-2 space-y-6">
          <DocumentCard
            document={document}
            onAttachClick={() => setAttachDialogOpen(true)}
            onUploadVersionClick={() => setVersionDialogOpen(true)}
            onDeleteClick={handleDelete}
            deleting={deleting}
          />

          <VersionHistory versions={history} />
        </div>

        {/* Right column */}
        <div>
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <DocumentHistoryTimeline versions={history} />
          </div>
        </div>
      </div>

      {/* Attachment Dialog */}
      <AttachmentDialog
        open={attachDialogOpen}
        onOpenChange={setAttachDialogOpen}
        onSubmit={handleAttachSubmit}
        onDetach={handleDetachSubmit}
        attachments={document.attachments || []}
        submitting={attachMutation.isPending || detachMutation.isPending}
      />

      {/* Version Upload Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New File Version</DialogTitle>
            <DialogDescription>
              Submit an updated version of this file. This increments the version sequence and archives the old file.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVersionSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground">New Version File</label>
              <FileUpload
                onFileSelect={(file) => {
                  setSelectedVersionFile(file);
                  if (file) setVersionFileError(null);
                }}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                maxSizeMB={10}
                loading={uploadVersionMutation.isPending}
              />
              {versionFileError && (
                <p className="text-xs font-semibold text-destructive">{versionFileError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVersionDialogOpen(false)}
                disabled={uploadVersionMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={uploadVersionMutation.isPending || !selectedVersionFile}
              >
                {uploadVersionMutation.isPending ? 'Uploading...' : 'Upload New Version'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
