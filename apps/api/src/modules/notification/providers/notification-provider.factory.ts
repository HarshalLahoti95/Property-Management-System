import { Injectable } from '@nestjs/common';
import { NotificationProvider } from '../interfaces/notification-provider.interface';
import { SMTPProvider } from './smtp.provider';
import { FakeProvider } from './fake.provider';

@Injectable()
export class NotificationProviderFactory {
  constructor(
    private readonly smtpProvider: SMTPProvider,
    private readonly fakeProvider: FakeProvider,
  ) {}

  getProvider(): NotificationProvider {
    const env = process.env.NODE_ENV;
    if (env === 'test') {
      return this.fakeProvider;
    }
    // Default to SMTP (console logger simulation in development)
    return this.smtpProvider;
  }
}
