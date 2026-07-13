'use client';
import * as React from 'react';
import { Document } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { formatFileSize } from './DocumentTable';
import { Button } from '@/components/ui/button';
import { DownloadButton } from './DownloadButton';
import { Calendar, HardDrive, User, Link, Trash2 } from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  onAttachClick?: () => void;
  onUploadVersionClick?: () => void;
  onDeleteClick?: () => void;
  deleting?: boolean;
}

export function DocumentCard({
  document,
  onAttachClick,
  onUploadVersionClick,
  onDeleteClick,
  deleting = false,
}: DocumentCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border pb-4 flex-wrap gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CategoryBadge category={document.category} />
            {document.parentId && (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                Sub-version
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground mt-1 truncate max-w-sm sm:max-w-md">
            {document.fileName}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton documentId={document.id} fileName={document.fileName} />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <HardDrive className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">File Parameters</p>
            <p className="text-sm font-medium text-foreground">
              Size: {formatFileSize(document.fileSize)}
            </p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{document.mimeType}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Dates</p>
            <p className="text-sm font-medium text-foreground">
              Uploaded: {new Date(document.createdAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Modified: {new Date(document.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Uploaded By</p>
            <p className="text-sm font-medium text-foreground">
              {document.uploadedBy?.fullName || 'System Uploader'}
            </p>
            <p className="text-xs text-muted-foreground uppercase">{document.uploadedBy?.role}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Link className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Attachments</p>
            <p className="text-sm font-medium text-foreground">
              {document.attachments?.length || 0} active links
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border pt-4 justify-end flex-wrap">
        {onDeleteClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteClick}
            disabled={deleting}
            className="text-destructive hover:bg-destructive/10 mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Document
          </Button>
        )}
        {onUploadVersionClick && (
          <Button variant="outline" size="sm" onClick={onUploadVersionClick}>
            Upload New Version
          </Button>
        )}
        {onAttachClick && (
          <Button variant="default" size="sm" onClick={onAttachClick}>
            Link Attachment
          </Button>
        )}
      </div>
    </div>
  );
}
