import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { TemplateRenderer } from './interfaces/template-renderer.interface';
import { NotificationProviderFactory } from './providers/notification-provider.factory';
import { NotificationHistory, UserPreference, NotificationStatus, UserRole } from '@prisma/client';
import { EventEmitter } from 'events';

// Create a globally injectable post-commit event bus
@Injectable()
export class NotificationEventBus extends EventEmitter {}

@Injectable()
export class NotificationService {
  private readonly templateRenderer: TemplateRenderer;

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly providerFactory: NotificationProviderFactory,
    @Inject('TemplateRenderer') templateRenderer: any,
    private readonly eventBus: NotificationEventBus,
  ) {
    this.templateRenderer = templateRenderer;
    this.registerEventListeners();
  }

  /**
   * Updates user preferences.
   */
  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<UserPreference> {
    return this.notificationRepository.updatePreferences(userId, dto);
  }

  /**
   * Fetches user preferences.
   */
  async getPreferences(userId: string): Promise<UserPreference> {
    return this.notificationRepository.findPreferencesByUserId(userId);
  }

  /**
   * Retrieves detail of a single logged notification.
   */
  async findOne(id: string, user: { id: string; role: string }): Promise<NotificationHistory> {
    const history = await this.notificationRepository.findHistoryById(id);
    if (!history) {
      throw new NotFoundException(`Notification history with ID ${id} not found.`);
    }

    if (user.role !== UserRole.ADMIN && history.userId !== user.id) {
      throw new ForbiddenException('You do not have access to view this notification.');
    }

    return history;
  }

  /**
   * Lists notification history log.
   */
  async findAll(
    query: NotificationQueryDto,
    user: { id: string; role: string },
  ): Promise<{
    data: NotificationHistory[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (query.page - 1) * query.limit;
    const userId = user.role !== UserRole.ADMIN ? user.id : undefined;

    const [data, total] = await Promise.all([
      this.notificationRepository.findHistories({ skip, take: query.limit, userId }),
      this.notificationRepository.countHistories({ userId }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };
  }

  /**
   * Send direct SMTP test notification (Admin only).
   */
  async sendTestNotification(adminId: string, recipientEmail: string): Promise<{ success: boolean }> {
    const rendered = '<h3>Connection Verification</h3><p>SMTP system connection verified successfully.</p>';
    
    // Dispatch synchronously to allow instant feedback in UI
    const provider = this.providerFactory.getProvider();
    const result = await provider.sendEmail(recipientEmail, 'Property Management System - Test Connection', rendered);

    await this.notificationRepository.createHistory({
      userId: adminId,
      recipient: recipientEmail,
      subject: 'Property Management System - Test Connection',
      template: 'TEST',
      status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
      provider: provider.constructor.name,
      deliveryResult: result.success ? 'Success' : result.error,
      retryCount: 0,
    });

    return { success: result.success };
  }

  /**
   * Enqueues a notification job asynchronously to ensure it does not run inside HTTP requests.
   */
  async enqueueNotification(
    recipient: string,
    subject: string,
    template: string,
    payload: any,
    userId?: string,
    isCritical = false,
  ): Promise<void> {
    // 1. Enforce preferences (only if not a critical security alert)
    if (userId && !isCritical) {
      const prefs = await this.notificationRepository.findPreferencesByUserId(userId);
      if (!prefs.emailEnabled || !prefs.marketingEmailsEnabled) {
        // Ignored as per user preferences
        return;
      }
    }

    // 2. Perform asynchronous rendering and delivery outside the active database transaction context
    setImmediate(async () => {
      const provider = this.providerFactory.getProvider();
      let status: NotificationStatus = NotificationStatus.SENT;
      let deliveryResult = 'Sent successfully';
      let htmlBody = '';

      try {
        htmlBody = await this.templateRenderer.render(template, payload);
        const result = await provider.sendEmail(recipient, subject, htmlBody);
        if (!result.success) {
          status = NotificationStatus.FAILED;
          deliveryResult = result.error || 'Delivery failed';
        }
      } catch (err) {
        status = NotificationStatus.FAILED;
        deliveryResult = (err as Error).message;
      }

      // Log notification history
      await this.notificationRepository.createHistory({
        userId,
        recipient,
        subject,
        template,
        status,
        provider: provider.constructor.name,
        deliveryResult,
        retryCount: 0,
      });
    });
  }

  /**
   * Hooks into the global event bus to listen for post-commit business events.
   */
  private registerEventListeners(): void {
    // 1. OTP Requested event
    this.eventBus.on('auth.otp_requested', async (data: { email: string; otp: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Your OTP Verification Code', 'OTP', { otp: data.otp }, data.userId, true);
    });

    // 2. Password Reset Requested event
    this.eventBus.on('auth.password_reset', async (data: { email: string; resetLink: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Password Reset Link', 'PASSWORD_RESET', { resetLink: data.resetLink }, data.userId, true);
    });

    // 3. Lease Activated event
    this.eventBus.on('lease.activated', async (data: { email: string; unitName: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Your Lease has been Activated', 'LEASE_ACTIVATED', { unitName: data.unitName }, data.userId, false);
    });

    // 4. Lease Terminated event
    this.eventBus.on('lease.terminated', async (data: { email: string; unitName: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Your Lease has been Terminated', 'LEASE_TERMINATED', { unitName: data.unitName }, data.userId, false);
    });

    // 5. Payment Received event
    this.eventBus.on('payment.received', async (data: { email: string; amount: number; method: string; reference: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Payment Receipt Confirmation', 'PAYMENT_RECEIPT', { amount: data.amount, method: data.method, reference: data.reference }, data.userId, false);
    });

    // 6. Payment Refunded event
    this.eventBus.on('payment.refunded', async (data: { email: string; amount: number; reference: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Refund Confirmation Details', 'REFUND', { amount: data.amount, reference: data.reference }, data.userId, false);
    });

    // 7. Maintenance Request Created event
    this.eventBus.on('maintenance.created', async (data: { email: string; title: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Maintenance Request Submitted', 'MAINTENANCE_CREATED', { title: data.title }, data.userId, false);
    });

    // 8. Maintenance Request Assigned event
    this.eventBus.on('maintenance.assigned', async (data: { email: string; title: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Maintenance Request Vendor Assigned', 'MAINTENANCE_ASSIGNED', { title: data.title }, data.userId, false);
    });

    // 9. Maintenance Request Completed event
    this.eventBus.on('maintenance.completed', async (data: { email: string; title: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Maintenance Request Resolved', 'MAINTENANCE_COMPLETED', { title: data.title }, data.userId, false);
    });

    // 10. Document Uploaded event
    this.eventBus.on('document.uploaded', async (data: { email: string; fileName: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Document Upload Confirmation', 'DOCUMENT_UPLOADED', { fileName: data.fileName }, data.userId, false);
    });

    // 11. Lease Pending Landlord Approval
    this.eventBus.on('lease.pending_landlord_approval', async (data: { email: string; unitName: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Lease Pending Your Approval', 'LEASE_PENDING_LANDLORD_APPROVAL', { unitName: data.unitName }, data.userId, false);
    });

    // 12. Lease Pending Tenant Signature
    this.eventBus.on('lease.pending_tenant_signature', async (data: { email: string; unitName: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Lease Ready for Your Signature', 'LEASE_PENDING_TENANT_SIGNATURE', { unitName: data.unitName }, data.userId, false);
    });

    // 13. Lease Pending Termination Approval
    this.eventBus.on('lease.pending_termination_approval', async (data: { email: string; unitName: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Lease Termination Requires Your Approval', 'LEASE_PENDING_TERMINATION_APPROVAL', { unitName: data.unitName }, data.userId, false);
    });

    // 14. Lease Landlord Rejected (back to draft)
    this.eventBus.on('lease.landlord_rejected', async (data: { unitName: string }) => {
      // Could notify admin here; for now, just log the event
    });

    // 15. Lease Expired (automatic)
    this.eventBus.on('lease.expired', async (data: { email: string; unitName: string; userId?: string }) => {
      await this.enqueueNotification(data.email, 'Your Lease Has Expired', 'LEASE_EXPIRED', { unitName: data.unitName }, data.userId, false);
    });
  }
}
