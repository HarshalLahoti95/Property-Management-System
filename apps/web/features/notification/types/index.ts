export type NotificationStatus = 'SENT' | 'FAILED' | 'PENDING';

export interface NotificationHistory {
  id: string;
  userId: string | null;
  recipient: string;
  subject: string;
  template: string;
  status: NotificationStatus;
  provider: string;
  retryCount: number;
  deliveryResult: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface UserPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  marketingEmailsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
