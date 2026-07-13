'use client';
import * as React from 'react';

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[50vh] bg-background">
      <div className="flex flex-col items-center space-y-4">
        {/* Loading Spinner */}
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading system resources...
        </p>
      </div>
    </div>
  );
}
