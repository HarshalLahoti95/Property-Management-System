import { Module, Global } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService, NotificationEventBus } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { HandlebarsTemplateRenderer } from './renderers/handlebars-template.renderer';
import { SMTPProvider } from './providers/smtp.provider';
import { FakeProvider } from './providers/fake.provider';
import { NotificationProviderFactory } from './providers/notification-provider.factory';

@Global()
@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    SMTPProvider,
    FakeProvider,
    NotificationProviderFactory,
    NotificationEventBus,
    {
      provide: 'TemplateRenderer',
      useClass: HandlebarsTemplateRenderer,
    },
  ],
  exports: [
    NotificationService,
    NotificationRepository,
    NotificationEventBus,
  ],
})
export class NotificationModule {}
