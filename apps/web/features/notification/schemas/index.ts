import { z } from 'zod';

export const preferenceSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  marketingEmailsEnabled: z.boolean(),
});

export type PreferenceFormValues = z.infer<typeof preferenceSchema>;

export const testNotificationSchema = z.object({
  email: z.string().email({ message: 'Please provide a valid recipient email address.' }),
});

export type TestNotificationFormValues = z.infer<typeof testNotificationSchema>;
