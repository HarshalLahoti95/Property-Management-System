'use client';
import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { propertyFormSchema, PropertyFormValues } from '../schemas';
import { useLandlords } from '../hooks/use-properties';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';

interface PropertyFormProps {
  defaultValues?: Partial<PropertyFormValues>;
  onSubmit: (values: PropertyFormValues) => void;
  submitLabel?: string;
  isAdmin?: boolean;
}

export function PropertyForm({ defaultValues, onSubmit, submitLabel = 'Save Property', isAdmin = false }: PropertyFormProps) {
  const mappedDefaultValues = React.useMemo(() => {
    if (!defaultValues) return undefined;
    return {
      ...defaultValues,
      units: defaultValues.units && defaultValues.units.length > 0
        ? defaultValues.units.map((u: any) => ({
            id: u.id,
            unitNumber: u.unitNumber,
            floor: u.floorLevel !== undefined ? u.floorLevel : (u.floor !== undefined ? u.floor : 1),
            bedrooms: u.bedCount !== undefined ? u.bedCount : (u.bedrooms !== undefined ? u.bedrooms : 1),
            bathrooms: u.bathCount !== undefined ? u.bathCount : (u.bathrooms !== undefined ? u.bathrooms : 1),
            squareFootage: u.squareFootage !== undefined ? u.squareFootage : 500,
            defaultRent: u.targetRent !== undefined ? Number(u.targetRent) : (u.defaultRent !== undefined ? u.defaultRent : 0),
            status: u.occupancyStatus !== undefined ? u.occupancyStatus : (u.status !== undefined ? u.status : 'VACANT'),
          }))
        : undefined,
    };
  }, [defaultValues]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema as any),
    defaultValues: {
      name: '',
      type: 'RESIDENTIAL',
      layout: 'STANDALONE',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      units: mappedDefaultValues?.units && mappedDefaultValues.units.length > 0 ? mappedDefaultValues.units : [
        {
          unitNumber: 'Main',
          floor: 1,
          bedrooms: 1,
          bathrooms: 1,
          squareFootage: 500,
          defaultRent: 0,
          status: 'VACANT',
        }
      ],
      ...mappedDefaultValues,
    },
  });

  React.useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('PropertyForm Validation Errors:', errors);
    }
  }, [errors]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'units',
  });

  const { data: landlords } = useLandlords();

  const layout = watch('layout');

  const processSubmit = (data: PropertyFormValues) => {
    if (data.layout === 'STANDALONE') {
      // Auto-generate single unit for standalone properties
      const singleUnit = data.units?.[0] || {
        unitNumber: 'Main',
        floor: 1,
        bedrooms: 0,
        bathrooms: 0,
        squareFootage: 100,
        defaultRent: 0,
        status: 'VACANT',
      };
      
      // We overwrite any dynamic units with a single auto-generated one
      data.units = [
        {
          ...singleUnit,
          unitNumber: 'Main',
        }
      ];
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1">
      <div className="space-y-4">
        {isAdmin && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">Landlord Owner</label>
            <select 
              {...register('landlordId', { required: 'Landlord is required when created by an Admin' })}
              className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a Landlord...</option>
              {landlords?.map((l: any) => (
                <option key={l.id} value={l.id}>{l.fullName} ({l.email})</option>
              ))}
            </select>
            {errors.landlordId && <p className="text-xs text-destructive">{errors.landlordId.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold">Name</label>
          <Input {...register('name')} placeholder="e.g. Sunny Apartments" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Type</label>
            <select {...register('type')} className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Property Structure</label>
            <select {...register('layout')} className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="STANDALONE">Standalone Property</option>
              <option value="MULTI_UNIT">Has Multiple Units</option>
            </select>
            {errors.layout && <p className="text-xs text-destructive">{errors.layout.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Street Address</label>
          <Input {...register('streetAddress')} placeholder="123 Main St" />
          {errors.streetAddress && <p className="text-xs text-destructive">{errors.streetAddress.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">City</label>
            <Input {...register('city')} />
            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">State / Union Territory</label>
            <select {...register('state')} className="flex h-9 w-full rounded-md border border-input bg-card text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Select State</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Delhi">Delhi</option>
              {/* Added a few common states for brevity, others can be added */}
              <option value="Karnataka">Karnataka</option>
              <option value="Gujarat">Gujarat</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="West Bengal">West Bengal</option>
            </select>
            {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">PIN Code</label>
          <Input {...register('zipCode')} placeholder="400001" />
          {errors.zipCode && <p className="text-xs text-destructive">{errors.zipCode.message}</p>}
        </div>
      </div>

      {/* Dynamic Unit Fields based on Layout */}
      <div className="border-t pt-4">
        <h3 className="text-md font-semibold mb-4">
          {layout === 'STANDALONE' ? 'Property Details' : 'Units'}
        </h3>
        
        {layout === 'STANDALONE' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Target Rent (₹)</label>
              <Input type="number" step="0.01" {...register('units.0.defaultRent', { valueAsNumber: true })} />
              {errors.units?.[0]?.defaultRent && <p className="text-xs text-destructive">{errors.units[0].defaultRent.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Square Footage</label>
              <Input type="number" {...register('units.0.squareFootage', { valueAsNumber: true })} />
              {errors.units?.[0]?.squareFootage && <p className="text-xs text-destructive">{errors.units[0].squareFootage.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Bedrooms</label>
              <Input type="number" {...register('units.0.bedrooms', { valueAsNumber: true })} />
              {errors.units?.[0]?.bedrooms && <p className="text-xs text-destructive">{errors.units[0].bedrooms.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Toilets/Bathrooms</label>
              <Input type="number" {...register('units.0.bathrooms', { valueAsNumber: true })} />
              {errors.units?.[0]?.bathrooms && <p className="text-xs text-destructive">{errors.units[0].bathrooms.message}</p>}
            </div>
            
            <input type="hidden" value={1} {...register('units.0.floor', { valueAsNumber: true })} />
            <input type="hidden" value="Main" {...register('units.0.unitNumber')} />
            <input type="hidden" value="VACANT" {...register('units.0.status')} />
          </div>
        )}

        {layout === 'MULTI_UNIT' && (
          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-md relative bg-muted/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mr-8">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Unit Number</label>
                    <Input {...register(`units.${index}.unitNumber`)} placeholder="e.g. 101" />
                    {errors.units?.[index]?.unitNumber && <p className="text-xs text-destructive">{errors.units[index].unitNumber?.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Rent (₹)</label>
                    <Input type="number" step="0.01" {...register(`units.${index}.defaultRent`, { valueAsNumber: true })} />
                    {errors.units?.[index]?.defaultRent && <p className="text-xs text-destructive">{errors.units[index].defaultRent?.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Floor</label>
                    <Input type="number" {...register(`units.${index}.floor`, { valueAsNumber: true })} />
                    {errors.units?.[index]?.floor && <p className="text-xs text-destructive">{errors.units[index].floor?.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Sq Ft</label>
                    <Input type="number" {...register(`units.${index}.squareFootage`, { valueAsNumber: true })} />
                    {errors.units?.[index]?.squareFootage && <p className="text-xs text-destructive">{errors.units[index].squareFootage?.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Beds</label>
                    <Input type="number" {...register(`units.${index}.bedrooms`, { valueAsNumber: true })} />
                    {errors.units?.[index]?.bedrooms && <p className="text-xs text-destructive">{errors.units[index].bedrooms?.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold">Toilets/Baths</label>
                    <Input type="number" {...register(`units.${index}.bathrooms`, { valueAsNumber: true })} />
                    {errors.units?.[index]?.bathrooms && <p className="text-xs text-destructive">{errors.units[index].bathrooms?.message}</p>}
                  </div>
                  <input type="hidden" value="VACANT" {...register(`units.${index}.status`)} />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ unitNumber: '', floor: 1, bedrooms: 1, bathrooms: 1, squareFootage: 500, defaultRent: 0, status: 'VACANT' })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Unit
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
