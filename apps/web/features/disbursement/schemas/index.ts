import { z } from 'zod';

export const getDisbursementFormSchema = (maxAvailable: number) => z.object({
  amount: z.number()
    .min(0.01, { message: 'Amount must be at least ₹0.01.' })
    .max(maxAvailable, { message: `Amount cannot exceed available trust funds (₹${maxAvailable.toFixed(2)}).` }),
  referenceNote: z.string().optional(),
});

export type DisbursementFormValues = z.infer<ReturnType<typeof getDisbursementFormSchema>>;
