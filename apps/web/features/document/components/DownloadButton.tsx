/* eslint-disable */
'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle } from 'lucide-react';
import { documentService } from '../services/document.service';

interface DownloadButtonProps {
  documentId: string;
  fileName?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function DownloadButton({
  documentId,
  fileName = 'file',
  variant = 'default',
  size = 'sm',
}: DownloadButtonProps) {
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await documentService.getDownloadUrl(documentId);
      if (response && response.downloadUrl) {
        // Open pre-signed S3 download URL in new tab / window to download
        window.open(response.downloadUrl, '_blank');
      } else {
        throw new Error('No download link retrieved.');
      }
    } catch (err: any) {
      console.error('Download trigger failed:', err);
      setError('Download failed.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        onClick={handleDownload}
        disabled={downloading}
        variant={error ? 'destructive' : variant}
        size={size}
        className="flex items-center gap-1.5"
      >
        <Download className="h-4 w-4" />
        {downloading ? 'Downloading...' : error ? error : 'Download'}
      </Button>
    </div>
  );
}
