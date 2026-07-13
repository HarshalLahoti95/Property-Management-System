import * as React from 'react';
import { DocumentVersion } from '../types';
import { formatFileSize } from './DocumentTable';
import { History, User, Clock, File } from 'lucide-react';

export function DocumentHistoryTimeline({ versions = [] }: { versions: DocumentVersion[] }) {
  // Sort descending by version number
  const sortedVersions = React.useMemo(() => {
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  }, [versions]);

  return (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
        <History className="h-5 w-5 text-primary" /> Version Lineage History
      </h3>

      {sortedVersions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 italic">No version history recorded yet.</p>
      ) : (
        <div className="relative pl-6 border-l border-border space-y-6">
          {sortedVersions.map((version) => (
            <div key={version.id} className="relative space-y-1">
              {/* Visual bullet indicator */}
              <div className="absolute -left-[31px] top-1 bg-background border border-border h-4.5 w-4.5 rounded-full flex items-center justify-center">
                <File className="h-2.5 w-2.5 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                <span className="font-bold text-foreground inline-flex items-center gap-1">
                  Version v{version.versionNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(version.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-sm text-foreground bg-muted/20 border border-border/40 p-3 rounded-lg">
                <p className="font-medium text-foreground truncate">{version.fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Size: {formatFileSize(version.fileSize)} • Type: {version.mimeType}
                </p>
                {version.uploadedBy && (
                  <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Uploaded by: <span className="font-semibold">{version.uploadedBy.fullName}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
