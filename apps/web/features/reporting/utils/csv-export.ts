/**
 * Utility function to trigger a browser download for a CSV string payload.
 */
export function triggerCSVDownload(csvContent: string, filename: string) {
  if (typeof window === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Extracts filename from Content-Disposition header.
 */
export function parseContentDispositionFilename(disposition?: string, fallback = 'report.csv'): string {
  if (!disposition) return fallback;
  const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
  const matches = filenameRegex.exec(disposition);
  if (matches != null && matches[1]) {
    return matches[1].replace(/['"]/g, '');
  }
  return fallback;
}
