'use client';
import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workOrderSchema, WorkOrderFormValues } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PropertyOption {
  id: string;
  name: string;
}

interface UnitOption {
  id: string;
  name: string;
  propertyId: string;
}

export function WorkOrderForm({
  properties = [],
  units = [],
  onSubmit,
  onPropertyChange,
  submitting = false,
  defaultValues,
  restrictToUnitId,
  restrictToPropertyId,
}: {
  properties: PropertyOption[];
  units: UnitOption[];
  onSubmit: (values: Record<string, unknown>) => void;
  onPropertyChange?: (propertyId: string) => void;
  submitting?: boolean;
  defaultValues?: Partial<WorkOrderFormValues>;
  restrictToUnitId?: string;
  restrictToPropertyId?: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema) as any,
    defaultValues: {
      propertyId: restrictToPropertyId || defaultValues?.propertyId || '',
      unitId: restrictToUnitId || defaultValues?.unitId || '',
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
      priority: defaultValues?.priority || 'MEDIUM',
      estimatedCost: defaultValues?.estimatedCost ?? undefined,
      targetCompletionDate: defaultValues?.targetCompletionDate
        ? new Date(defaultValues.targetCompletionDate).toISOString().split('T')[0]
        : '',
    },
  });

  const selectedPropertyId = useWatch({ control, name: 'propertyId' });

  // Filter units based on selected property
  const filteredUnits = React.useMemo(() => {
    if (!selectedPropertyId) return [];
    return units.filter((u) => u.propertyId === selectedPropertyId);
  }, [selectedPropertyId, units]);

  // If restrictToPropertyId or restrictToUnitId are active, apply changes on load
  React.useEffect(() => {
    if (restrictToPropertyId) {
      setValue('propertyId', restrictToPropertyId);
    }
    if (restrictToUnitId) {
      setValue('unitId', restrictToUnitId);
    }
  }, [restrictToPropertyId, restrictToUnitId, setValue]);
  React.useEffect(() => {
    if (onPropertyChange && selectedPropertyId) {
      onPropertyChange(selectedPropertyId);
    }
  }, [selectedPropertyId, onPropertyChange]);
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 max-w-lg bg-card p-6 border border-border rounded-lg shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Property selection */}
        <div className="space-y-1">
          <label htmlFor="form-propertyId" className="text-sm font-semibold text-foreground">
            Property location
          </label>
          <select
            id="form-propertyId"
            {...register('propertyId')}
            disabled={submitting || !!restrictToPropertyId}
            className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-60"
          >
            <option value="">Select Property...</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.propertyId && (
            <p className="text-xs font-semibold text-destructive">{errors.propertyId.message}</p>
          )}
        </div>

        {/* Unit selection */}
        <div className="space-y-1">
          <label htmlFor="form-unitId" className="text-sm font-semibold text-foreground">
            Unit (Optional)
          </label>
          <select
            id="form-unitId"
            {...register('unitId')}
            disabled={submitting || !!restrictToUnitId || !selectedPropertyId}
            className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-60"
          >
            <option value="">Property-wide (No specific unit)</option>
            {filteredUnits.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.name}
              </option>
            ))}
          </select>
          {errors.unitId && (
            <p className="text-xs font-semibold text-destructive">{errors.unitId.message}</p>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label htmlFor="form-title" className="text-sm font-semibold text-foreground">
          Issue Summary / Title
        </label>
        <Input
          id="form-title"
          placeholder="e.g. Broken heating elements in bathroom"
          {...register('title')}
          disabled={submitting}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-xs font-semibold text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="form-description" className="text-sm font-semibold text-foreground">
          Detailed Description
        </label>
        <textarea
          id="form-description"
          placeholder="Provide explicit details about the maintenance issue, troubleshooting attempts, and access codes if relevant."
          {...register('description')}
          disabled={submitting}
          className="w-full min-h-[100px] rounded-md border border-input bg-card p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-65"
        />
        {errors.description && (
          <p className="text-xs font-semibold text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Priority Selection */}
      <div className="space-y-1">
        <label htmlFor="form-priority" className="text-sm font-semibold text-foreground">
          Priority Level
        </label>
        <select
          id="form-priority"
          {...register('priority')}
          disabled={submitting}
          className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <option value="LOW">Low - General inquiry / minor wear</option>
          <option value="MEDIUM">Medium - Functional issue / standard repair</option>
          <option value="HIGH">High - Severe malfunction / security issue</option>
          <option value="EMERGENCY">Emergency - Severe active flooding / fire / immediate hazard</option>
        </select>
        {errors.priority && (
          <p className="text-xs font-semibold text-destructive">{errors.priority.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Estimated Cost */}
        <div className="space-y-1">
          <label htmlFor="form-estimatedCost" className="text-sm font-semibold text-foreground">
            Estimated Cost (₹)
          </label>
          <Input
            id="form-estimatedCost"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('estimatedCost')}
            disabled={submitting}
          />
          {errors.estimatedCost && (
            <p className="text-xs font-semibold text-destructive">{errors.estimatedCost.message}</p>
          )}
        </div>

        {/* Target Completion Date */}
        <div className="space-y-1">
          <label htmlFor="form-targetCompletionDate" className="text-sm font-semibold text-foreground">
            Target Completion Date
          </label>
          <Input
            id="form-targetCompletionDate"
            type="date"
            {...register('targetCompletionDate')}
            disabled={submitting}
          />
          {errors.targetCompletionDate && (
            <p className="text-xs font-semibold text-destructive">
              {errors.targetCompletionDate.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full mt-2">
        {submitting ? 'Saving request...' : defaultValues ? 'Update Work Order' : 'Submit Request'}
      </Button>
    </form>
  );
}
