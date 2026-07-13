'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function DocumentDetailError({ error, reset }: { error: Error; reset: () => void }) {
  React.useEffect(() => {
    console.error('Document detail route error:', error);
  }, [error]);

  return (
    <div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5 text-center space-y-4 max-w-lg mx-auto my-12">
      <h3 className="text-lg font-bold text-destructive">Failed to load document details</h3>
      <p className="text-sm text-muted-foreground">
        {error.message || 'An unexpected query or network error occurred.'}
      </p>
      <div className="flex justify-center gap-4">
        <Button onClick={reset} variant="default">
          Retry Action
        </Button>
        <Button onClick={() => (window.location.href = '/dashboard/documents')} variant="outline">
          Back to List
        </Button>
      </div>
    </div>
  );
}
