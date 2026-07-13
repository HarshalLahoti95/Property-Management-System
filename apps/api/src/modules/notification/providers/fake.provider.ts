import { Injectable } from '@nestjs/common';
import { NotificationProvider } from '../interfaces/notification-provider.interface';

@Injectable()
export class FakeProvider implements NotificationProvider {
  public sentEmails: Array<{ recipient: string; subject: string; htmlBody: string }> = [];

  async sendEmail(recipient: string, subject: string, htmlBody: string) {
    this.sentEmails.push({ recipient, subject, htmlBody });
    return { success: true, messageId: `fake-${Date.now()}` };
  }

  clear() {
    this.sentEmails = [];
  }
}
