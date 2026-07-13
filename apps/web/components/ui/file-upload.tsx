'use client';
import * as React from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  loading?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = '*/*',
  maxSizeMB = 10,
  loading = false,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds maximum limit of ${maxSizeMB}MB.`);
      onFileSelect(null);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        id="file-upload-input"
        className="hidden"
        accept={accept}
        onChange={handleChange}
        disabled={loading}
      />

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all duration-200 ${
            dragActive
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-border bg-card hover:bg-muted/30'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2 animate-bounce" />
          <p className="text-sm font-semibold text-foreground">
            Drag & drop file here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Accepts {accept.replace(/\*/g, '')} files (Max {maxSizeMB}MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between border border-border bg-muted/20 p-3 rounded-lg animate-fade-in">
          <div className="flex items-center gap-3 truncate">
            <File className="h-6 w-6 text-primary shrink-0" />
            <div className="truncate">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={removeFile}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs font-semibold text-destructive mt-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="w-full bg-secondary h-1 rounded-full overflow-hidden mt-2">
          <div className="bg-primary h-full animate-progress-bar rounded-full" style={{ width: '40%' }} />
        </div>
      )}
    </div>
  );
}
