/* eslint-disable */
'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { WorkOrderForm, useCreateWorkOrder } from '@/features/maintenance';
import { apiClient } from '@/lib/api-client';
import { Wrench, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NewWorkOrderPage() {
  const router = useRouter();
  const createMutation = useCreateWorkOrder();

  const [properties, setProperties] = React.useState<any[]>([]);
  const [units, setUnits] = React.useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(true);

  React.useEffect(() => {
    setLoadingOptions(true);
    apiClient
      .get('/properties')
      .then((res) => {
        setProperties(res.data.data || res.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch properties:', err);
      })
      .finally(() => {
        setLoadingOptions(false);
      });
  }, []);

  const handlePropertyChange = async (propertyId: string) => {
    if (!propertyId) {
      setUnits([]);
      return;
    }
    try {
      const res = await apiClient.get(`/properties/${propertyId}/units`);
      setUnits(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch property units:', err);
    }
  };

  const onSubmit = (values: any) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        router.push('/dashboard/maintenance');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Link href="/dashboard/maintenance">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" /> Request Maintenance Work Order
          </h1>
          <p className="text-sm text-muted-foreground">
            Submit a new work request. Provide accurate details to dispatch the correct service provider.
          </p>
        </div>
      </div>

      {loadingOptions ? (
        <div className="h-64 bg-secondary animate-pulse rounded-md max-w-lg" />
      ) : (
        <div className="max-w-xl">
          {/* We hook into property select change using a wrapper or letting the form handle it */}
          <WorkOrderForm
            properties={properties}
            units={units}
            submitting={createMutation.isPending}
            onSubmit={onSubmit}
            onPropertyChange={handlePropertyChange}
            restrictToPropertyId=""
          />
        </div>
      )}
    </div>
  );
}
