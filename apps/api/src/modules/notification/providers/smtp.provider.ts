import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from '../interfaces/notification-provider.interface';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SMTPProvider implements NotificationProvider {
  private readonly logger = new Logger(SMTPProvider.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '1025', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const auth = user && pass ? { user, pass } : undefined;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(recipient: string, subject: string, htmlBody: string) {
    const from = process.env.SMTP_FROM || 'no-reply@pms.com';
    try {
      this.logger.log(`SMTP sending email to ${recipient}: [Subject: ${subject}]`);
      const info = await this.transporter.sendMail({
        from,
        to: recipient,
        subject,
        html: htmlBody,
      });
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send SMTP email to ${recipient}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
