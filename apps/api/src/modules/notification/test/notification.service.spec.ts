import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService, NotificationEventBus } from '../notification.service';
import { NotificationRepository } from '../notification.repository';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationProviderFactory } from '../providers/notification-provider.factory';
import { HandlebarsTemplateRenderer } from '../renderers/handlebars-template.renderer';
import { FakeProvider } from '../providers/fake.provider';
import { SMTPProvider } from '../providers/smtp.provider';
import { NotificationStatus, UserRole } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: NotificationRepository;
  let fakeProvider: FakeProvider;
  let eventBus: NotificationEventBus;
  let renderer: HandlebarsTemplateRenderer;

  const mockUser = { id: 'user-1', email: 'user@example.com' };
  const mockPreferences = {
    id: 'pref-1',
    userId: 'user-1',
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: false,
    marketingEmailsEnabled: true,
  };

  const mockHistory = {
    id: 'log-1',
    userId: 'user-1',
    recipient: 'user@example.com',
    subject: 'OTP Code',
    template: 'OTP',
    status: NotificationStatus.SENT,
    provider: 'FakeProvider',
    retryCount: 0,
    deliveryResult: 'Success',
  };

  beforeEach(async () => {
    renderer = new HandlebarsTemplateRenderer();
    fakeProvider = new FakeProvider();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        NotificationEventBus,
        {
          provide: NotificationRepository,
          useValue: {
            findHistoryById: jest.fn().mockResolvedValue(mockHistory),
            findHistories: jest.fn().mockResolvedValue([mockHistory]),
            countHistories: jest.fn().mockResolvedValue(1),
            findPreferencesByUserId: jest.fn().mockResolvedValue(mockPreferences),
            updatePreferences: jest.fn().mockResolvedValue(mockPreferences),
            createHistory: jest.fn().mockResolvedValue(mockHistory),
          },
        },
        {
          provide: NotificationProviderFactory,
          useValue: {
            getProvider: jest.fn().mockReturnValue(fakeProvider),
          },
        },
        {
          provide: 'TemplateRenderer',
          useValue: renderer,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    repository = module.get<NotificationRepository>(NotificationRepository);
    eventBus = module.get<NotificationEventBus>(NotificationEventBus);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('TemplateRenderer', () => {
    it('should successfully compile handlebars layout variables', async () => {
      const result = await renderer.render('OTP', { otp: '4321' });
      expect(result).toContain('<strong>4321</strong>');
    });
  });

  describe('updatePreferences', () => {
    it('should update user preference attributes', async () => {
      const dto = { emailEnabled: false };
      const result = await service.updatePreferences('user-1', dto);
      expect(repository.updatePreferences).toHaveBeenCalledWith('user-1', dto);
      expect(result).toBeDefined();
    });
  });

  describe('enqueueNotification', () => {
    it('should skip non-critical notifications if globally disabled by user preference', async () => {
      const optOutPrefs = { ...mockPreferences, emailEnabled: false };
      jest.spyOn(repository, 'findPreferencesByUserId').mockResolvedValueOnce(optOutPrefs as any);

      await service.enqueueNotification('user@example.com', 'Receipt', 'PAYMENT_RECEIPT', { amount: 100 }, 'user-1', false);

      // setImmediate helper triggers async
      await new Promise((resolve) => setImmediate(resolve));

      expect(fakeProvider.sentEmails).toHaveLength(0);
    });

    it('should execute delivery regardless of opt-outs if marked as critical security alert', async () => {
      const optOutPrefs = { ...mockPreferences, emailEnabled: false };
      jest.spyOn(repository, 'findPreferencesByUserId').mockResolvedValueOnce(optOutPrefs as any);

      await service.enqueueNotification('user@example.com', 'OTP code', 'OTP', { otp: '1111' }, 'user-1', true);

      await new Promise((resolve) => setImmediate(resolve));

      expect(fakeProvider.sentEmails).toHaveLength(1);
      expect(fakeProvider.sentEmails[0].recipient).toBe('user@example.com');
    });
  });

  describe('Event Bus Listener', () => {
    it('should hook OTP requested trigger and dispatch async code delivery', async () => {
      eventBus.emit('auth.otp_requested', { email: 'test@example.com', otp: '7777', userId: 'user-1' });

      await new Promise((resolve) => setImmediate(resolve));

      expect(fakeProvider.sentEmails).toHaveLength(1);
      expect(fakeProvider.sentEmails[0].recipient).toBe('test@example.com');
    });
  });
});
