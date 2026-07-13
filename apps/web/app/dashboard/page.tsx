'use client';
import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AdminDashboard } from './components/AdminDashboard';
import { LandlordDashboard } from './components/LandlordDashboard';
import { TenantDashboard } from './components/TenantDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground animate-pulse">Checking credentials...</p>
      </div>
    );
  }

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'LANDLORD':
      return <LandlordDashboard />;
    case 'TENANT':
      return <TenantDashboard />;
    default:
      return (
        <div className="p-6 bg-card border border-border rounded-xl text-center">
          <h2 className="text-lg font-bold text-destructive">Unauthorized Access</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your user role &quot;{user.role}&quot; is not recognized by the dashboard shell.
          </p>
        </div>
      );
  }
}
