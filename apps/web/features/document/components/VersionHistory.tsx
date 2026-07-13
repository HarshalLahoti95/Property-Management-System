/* eslint-disable */
import * as React from 'react';
import { DocumentVersion } from '../types';
import { formatFileSize } from './DocumentTable';
import { Clock, User } from 'lucide-react';

export function VersionHistory({ versions = [] }: { versions: DocumentVersion[] }) {
  const sortedVersions = React.useMemo(() => {
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [versions]);

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" /> Document Versions
      </h3>

      <div className="divide-y divide-border/60">
        {sortedVersions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 italic text-center">
            No version history recorded.
          </p>
        ) : (
          sortedVersions.map((version) => (
            <div key={version.id} className="py-3 flex justify-between items-start flex-wrap gap-2 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-sm">
                  {version.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Size: {formatFileSize(version.fileSize)} • Uploaded by{' '}
                  <span className="font-semibold">{version.uploadedBy?.fullName || 'User'}</span>
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  v{version.versionNumber}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(version.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
