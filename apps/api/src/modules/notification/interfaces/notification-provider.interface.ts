export interface NotificationProvider {
  sendEmail(recipient: string, subject: string, htmlBody: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
