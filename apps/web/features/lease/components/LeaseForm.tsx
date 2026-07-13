import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaseFormSchema, LeaseFormValues } from '../schemas';
import { LeaseTenantSelector } from './LeaseTenantSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';

export function LeaseForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Save Lease',
}: {
  defaultValues?: Partial<LeaseFormValues>;
  onSubmit: (values: LeaseFormValues) => void;
  submitLabel?: string;
}) {
  const [properties, setProperties] = React.useState<any[]>([]);
  const [units, setUnits] = React.useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = React.useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      unitId: '',
      startDate: '',
      endDate: '',
      monthlyRent: 0,
      securityDeposit: 0,
      rentDueDay: 1,
      gracePeriodDays: 5,
      tenantIds: [],
      ...defaultValues,
    },
  });

  React.useEffect(() => {
    apiClient.get('/properties').then((res) => {
      setProperties(res.data.data || res.data || []);
    });
  }, []);

  React.useEffect(() => {
    if (selectedPropertyId) {
      apiClient.get(`/properties/${selectedPropertyId}/units`).then((res) => {
        const fetchedUnits = res.data.data || res.data || [];
        const vacantUnits = fetchedUnits.filter((u: any) => u.occupancyStatus === 'VACANT');
        setUnits(vacantUnits);

        const selectedProp = properties.find((p) => p.id === selectedPropertyId);
        if (selectedProp?.layout === 'STANDALONE' && vacantUnits.length > 0) {
          setValue('unitId', vacantUnits[0].id, { shouldValidate: true });
        } else if (!defaultValues?.unitId) {
          setValue('unitId', '');
        }
      });
    } else {
      setUnits([]);
      if (!defaultValues?.unitId) {
        setValue('unitId', '');
      }
    }
  }, [selectedPropertyId, properties, setValue, defaultValues]);

  const selectedProp = properties.find((p) => p.id === selectedPropertyId);
  const isStandalone = selectedProp?.layout === 'STANDALONE';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-2xl bg-card border border-border p-6 rounded-lg shadow-sm animate-in duration-300"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!defaultValues?.unitId && (
          <div className="space-y-2">
            <span className="text-sm font-semibold text-foreground block">Select Property</span>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">-- Choose Property --</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!defaultValues?.unitId && !isStandalone && (
          <div className="space-y-2">
            <span className="text-sm font-semibold text-foreground block">Select Unit</span>
            <select
              {...register('unitId')}
              className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">-- Choose Unit --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id} disabled={u.occupancyStatus === 'OCCUPIED'}>
                  {u.unitNumber} {u.occupancyStatus === 'OCCUPIED' ? '(Occupied)' : ''}
                </option>
              ))}
            </select>
            {errors.unitId && <p className="text-xs text-destructive">{errors.unitId.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-sm font-semibold text-foreground block">Start Date</span>
          <Input type="date" {...register('startDate')} />
          {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-foreground block">End Date</span>
          <Input type="date" {...register('endDate')} />
          {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-foreground block">Monthly Rent (₹)</span>
          <Input type="number" step="0.01" {...register('monthlyRent', { valueAsNumber: true })} />
          {errors.monthlyRent && <p className="text-xs text-destructive">{errors.monthlyRent.message}</p>}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-foreground block">Security Deposit (₹)</span>
          <Input type="number" step="0.01" {...register('securityDeposit', { valueAsNumber: true })} />
          {errors.securityDeposit && <p className="text-xs text-destructive">{errors.securityDeposit.message}</p>}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-foreground block">Rent Due Day</span>
          <Input type="number" {...register('rentDueDay', { valueAsNumber: true })} />
          {errors.rentDueDay && <p className="text-xs text-destructive">{errors.rentDueDay.message}</p>}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-foreground block">Grace Period (Days)</span>
          <Input type="number" {...register('gracePeriodDays', { valueAsNumber: true })} />
          {errors.gracePeriodDays && <p className="text-xs text-destructive">{errors.gracePeriodDays.message}</p>}
        </div>
      </div>

      <Controller
        name="tenantIds"
        control={control}
        render={({ field }) => <LeaseTenantSelector value={field.value} onChange={field.onChange} />}
      />
      {errors.tenantIds && <p className="text-xs text-destructive">{errors.tenantIds.message}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
