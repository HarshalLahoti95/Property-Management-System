import { z } from 'zod';

export const leaseFormSchema = z.object({
  unitId: z.string().uuid({ message: 'A valid unit must be selected' }),
  startDate: z.string().min(1, { message: 'Start date is required' }),
  endDate: z.string().min(1, { message: 'End date is required' }),
  monthlyRent: z.number().min(0.01, { message: 'Monthly rent must be greater than 0' }),
  securityDeposit: z.number().min(0, { message: 'Security deposit must be 0 or greater' }),
  rentDueDay: z.number().int().min(1).max(31, { message: 'Rent due day must be between 1 and 31' }),
  gracePeriodDays: z.number().int().min(0).max(30, { message: 'Grace period must be between 0 and 30 days' }),
  tenantIds: z.array(z.string().uuid()).min(1, { message: 'At least one tenant must be assigned' }),
});

export type LeaseFormValues = z.infer<typeof leaseFormSchema>;
