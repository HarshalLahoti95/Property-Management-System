import { z } from 'zod';

export const paymentFormSchema = z.object({
  leaseId: z.string().uuid({ message: 'Please select a lease agreement.' }),
  tenantId: z.string().optional(),
  amount: z.number().min(0.01, { message: 'Payment amount must be at least ₹0.01.' }),
  paymentMethod: z.enum(['ACH', 'CREDIT_CARD', 'CASH', 'CHECK'], {
    message: 'Please select a valid payment method.',
  }),
  transactionReference: z.string().optional(),
  paymentDate: z.string().min(1, { message: 'Please select a payment date.' }),
}).superRefine((data, ctx) => {
  if (data.paymentMethod !== 'CASH' && (!data.transactionReference || data.transactionReference.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Transaction reference is required for non-cash payments.',
      path: ['transactionReference'],
    });
  }
  
  if (!data.tenantId || data.tenantId.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please select the paying tenant.',
      path: ['tenantId'],
    });
  }
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const refundFormSchema = z.object({
  amount: z.number().min(0.01).optional(),
  reason: z.string().min(1, { message: 'Refund reason is required.' }),
});

export type RefundFormValues = z.infer<typeof refundFormSchema>;
