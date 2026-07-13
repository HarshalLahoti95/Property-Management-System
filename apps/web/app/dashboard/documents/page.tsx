'use client';
import * as React from 'react';
import { useDocuments, useUploadDocument } from '@/features/document';
import { DocumentTable, DocumentUploadDialog } from '@/features/document';
import { Button } from '@/components/ui/button';
import { FolderOpen, Upload, RefreshCw } from 'lucide-react';

export default function DocumentsListPage() {
  const [page, setPage] = React.useState(1);
  const [category, setCategory] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<string>('createdAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);

  const { data, isLoading, refetch } = useDocuments({
    page,
    limit: 10,
    category: category || undefined,
    sortBy,
    sortOrder,
  });

  const uploadMutation = useUploadDocument();

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleUploadSubmit = (payload: { file: File; category: string }) => {
    uploadMutation.mutate(payload, {
      onSuccess: () => {
        setUploadDialogOpen(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderOpen className="h-8 w-8 text-primary" /> Document Repository
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage lease agreements, receipts, identity documents, and maintenance attachment assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setUploadDialogOpen(true)} className="h-9 flex items-center gap-1.5">
            <Upload className="h-4 w-4" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg flex-wrap">
        <div className="space-y-1">
          <label htmlFor="filter-category" className="text-xs font-semibold text-muted-foreground uppercase">
            Filter Category
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="block w-48 h-9 rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus:outline-hidden"
          >
            <option value="">All Categories</option>
            <option value="LEASE_AGREEMENT">Lease Agreement</option>
            <option value="GOVERNMENT_ID">Government ID</option>
            <option value="INVOICE">Invoice</option>
            <option value="RECEIPT">Receipt</option>
            <option value="DAMAGE_PHOTO">Damage Photo</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <DocumentTable
          documents={data?.data || []}
          loading={isLoading}
          page={page}
          totalPages={data?.meta?.totalPages || 1}
          onPageChange={setPage}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSubmit={handleUploadSubmit}
        submitting={uploadMutation.isPending}
      />
    </div>
  );
}
