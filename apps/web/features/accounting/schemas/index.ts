import { z } from 'zod';

export const chargeFormSchema = z.object({
  leaseId: z.string().uuid({ message: 'Invalid Lease reference.' }),
  type: z.enum(['RENT', 'SECURITY_DEPOSIT', 'LATE_FEE', 'UTILITY', 'MAINTENANCE', 'MISC'], {
    message: 'Please select a valid charge type.',
  }),
  amount: z.number().min(0.01, { message: 'Amount must be at least $0.01.' }),
  dueDate: z.string().min(1, { message: 'Please select a valid due date.' }),
  description: z.string().min(1, { message: 'Please provide a description.' }),
});

export type ChargeFormValues = z.infer<typeof chargeFormSchema>;

export const adjustFormSchema = z.object({
  amount: z.number().min(0.01, { message: 'Adjustment must be at least $0.01.' }),
  description: z.string().min(1, { message: 'Please provide an adjustment explanation.' }),
});

export type AdjustFormValues = z.infer<typeof adjustFormSchema>;
