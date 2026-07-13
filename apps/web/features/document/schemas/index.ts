import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  category: z.enum(
    ['LEASE_AGREEMENT', 'GOVERNMENT_ID', 'INVOICE', 'RECEIPT', 'DAMAGE_PHOTO', 'OTHER'],
    {
      message: 'Please select a valid document category.',
    }
  ),
});

export type UploadDocumentFormValues = z.infer<typeof uploadDocumentSchema>;

export const attachDocumentSchema = z.object({
  entityType: z.enum(['LEASE', 'USER', 'WORK_ORDER', 'PAYMENT'], {
    message: 'Please select a valid entity type.',
  }),
  entityId: z.string().uuid({ message: 'Target entity ID must be a valid UUID.' }),
});

export type AttachDocumentFormValues = z.infer<typeof attachDocumentSchema>;
