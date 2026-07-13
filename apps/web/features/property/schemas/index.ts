import * as z from 'zod';

export const propertyFormSchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  type: z.enum(['RESIDENTIAL', 'COMMERCIAL']),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().regex(/^\d{6}$/, 'Must be a valid 6-digit PIN code'),
  layout: z.enum(['STANDALONE', 'MULTI_UNIT']),
  landlordId: z.string().optional(),
  units: z.array(
    z.object({
      id: z.string().optional(),
      unitNumber: z.string().min(1, 'Unit number is required'),
      floor: z.preprocess((v) => Number(v), z.number().int().min(0, 'Floor must be 0 or greater')),
      bedrooms: z.preprocess((v) => Number(v), z.number().int().min(0, 'Bedrooms must be 0 or greater')),
      bathrooms: z.preprocess((v) => Number(v), z.number().int().min(0, 'Bathrooms must be 0 or greater')),
      squareFootage: z.preprocess((v) => Number(v), z.number().int().min(1, 'Square footage must be greater than 0')),
      defaultRent: z.preprocess((v) => Number(v), z.number().min(0, 'Rent cannot be negative')),
      status: z.enum(['VACANT', 'OCCUPIED', 'NOTICE_GIVEN', 'MAINTENANCE']),
    })
  ).optional(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
