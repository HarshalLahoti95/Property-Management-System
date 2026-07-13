'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Captured app layout rendering error:', error);
  }, [error]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-[60vh] px-4 text-center bg-background">
      <div className="max-w-md space-y-6">
        <div className="inline-flex p-4 rounded-full bg-destructive/10 text-destructive mb-2">
          <svg
            className="w-12 h-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Something went wrong!
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {error.message || 'An unexpected rendering error occurred inside the web application shell.'}
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="default" onClick={reset}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
