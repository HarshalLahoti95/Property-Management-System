import * as React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { reportingService } from '../../services/reporting.service';
import { triggerCSVDownload } from '../../utils/csv-export';
import { Button } from '@/components/ui/button';

interface CSVDownloadButtonProps {
  type: 'leases' | 'financials';
  label: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default';
}

export function CSVDownloadButton({
  type,
  label,
  variant = 'outline',
  size = 'sm',
}: CSVDownloadButtonProps) {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data, filename } =
        type === 'leases'
          ? await reportingService.downloadLeasesExport()
          : await reportingService.downloadFinancialsExport();
      
      triggerCSVDownload(data, filename);
    } catch {
      alert(`Export failed: unable to download ${type} CSV report.`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading}
      aria-label={`Export ${label} report as CSV`}
      className="flex items-center gap-2"
    >
      {downloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      <span>{downloading ? 'Downloading...' : label}</span>
    </Button>
  );
}
