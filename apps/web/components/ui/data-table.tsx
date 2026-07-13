'use client';
import * as React from 'react';
import { Button } from './button';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data = [],
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  sortBy,
  sortOrder = 'asc',
  onSort,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  const handleSort = (field: string, sortable?: boolean) => {
    if (!sortable || !onSort) return;
    const nextOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(field, nextOrder);
  };

  if (loading) {
    return (
      <div className="space-y-4" data-testid="datatable-loading">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 w-full bg-secondary/50 animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-md text-center bg-card" data-testid="datatable-empty">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border rounded-md bg-card">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
              {columns.map((col, idx) => {
                const isCurrentSort = col.accessorKey && sortBy === col.accessorKey;
                return (
                  <th
                    key={idx}
                    onClick={() => col.accessorKey && handleSort(col.accessorKey as string, col.sortable)}
                    className={`p-3 select-none ${col.sortable && onSort ? 'cursor-pointer hover:bg-muted transition-colors' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && onSort && (
                        <span className="text-muted-foreground/60">
                          {isCurrentSort ? (
                            sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 opacity-0 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                {columns.map((col, idx) => {
                  let renderedValue: React.ReactNode = '';
                  if (col.cell) {
                    renderedValue = col.cell(item);
                  } else if (col.accessorKey) {
                    renderedValue = String((item as Record<string, unknown>)[col.accessorKey as string] ?? '');
                  }
                  return (
                    <td key={idx} className="p-3">
                      {renderedValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
