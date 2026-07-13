import { z } from 'zod';

export const workOrderSchema = z
  .object({
    propertyId: z.string().optional(),
    unitId: z.string().optional(),
    title: z.string().min(1, { message: 'Title is required.' }),
    description: z.string().min(1, { message: 'Description is required.' }),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'], {
      message: 'Please select a valid priority level.',
    }),
    estimatedCost: z.preprocess(
      (val) => (val === '' || val === null || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
      z.number().min(0, { message: 'Cost must be non-negative.' }).optional()
    ),
    targetCompletionDate: z.string().optional(),
  })
  .refine((data) => data.propertyId || data.unitId, {
    message: 'Either Property or Unit is required.',
    path: ['propertyId'],
  });

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

export const assignVendorSchema = z.object({
  vendorId: z.string().uuid({ message: 'Please select a valid vendor.' }),
});

export type AssignVendorFormValues = z.infer<typeof assignVendorSchema>;

export const transitionStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CANCELLED'], {
    message: 'Please select a valid status.',
  }),
  reasonDescription: z.string().optional().or(z.literal('')),
});

export type TransitionStatusFormValues = z.infer<typeof transitionStatusSchema>;

export const commentSchema = z.object({
  commentText: z.string().min(1, { message: 'Comment text cannot be empty.' }),
});

export type CommentFormValues = z.infer<typeof commentSchema>;
