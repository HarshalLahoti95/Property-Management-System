import * as React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-[60vh] px-4 text-center bg-background">
      <div className="max-w-md space-y-6">
        <h1 className="text-9xl font-black text-primary/10 tracking-widest select-none">
          404
        </h1>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Page Not Found
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The dashboard resource or screen path you are trying to reach does not exist or has been relocated.
        </p>
        <div className="flex justify-center">
          <Link href="/dashboard">
            <Button variant="default">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
