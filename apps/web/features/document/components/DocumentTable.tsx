import * as React from 'react';
import { Document } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/data-table';

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function DocumentTable({
  documents = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
}: {
  documents: Document[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const columns: Column<Document>[] = [
    {
      header: 'File Name',
      accessorKey: 'fileName',
      cell: (item) => (
        <div className="max-w-[250px] truncate">
          <p className="font-semibold text-foreground truncate">{item.fileName}</p>
          <p className="text-xs text-muted-foreground truncate">{item.mimeType}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (item) => <CategoryBadge category={item.category} />,
      sortable: true,
    },
    {
      header: 'Size',
      accessorKey: 'fileSize',
      cell: (item) => <span>{formatFileSize(item.fileSize)}</span>,
      sortable: true,
    },
    {
      header: 'Uploaded',
      accessorKey: 'createdAt',
      cell: (item) => new Date(item.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      header: 'Uploaded By',
      cell: (item) => <span>{item.uploadedBy?.fullName || 'System'}</span>,
    },
    {
      header: 'Actions',
      cell: (item) => (
        <Link href={`/dashboard/documents/${item.id}`}>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={documents}
      loading={loading}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      emptyMessage="No documents found."
    />
  );
}
