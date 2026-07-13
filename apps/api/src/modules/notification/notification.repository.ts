import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repositories/base.repository';
import { PrismaService } from '../../database/prisma.service';
import { NotificationHistory, UserPreference, Prisma } from '@prisma/client';

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationHistory> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'notificationHistory');
  }

  /**
   * Retrieves a notification history record by its UUID.
   */
  async findHistoryById(id: string): Promise<NotificationHistory | null> {
    return this.prisma.notificationHistory.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  /**
   * Lists notification history records with pagination.
   */
  async findHistories(params: { skip: number; take: number; userId?: string }): Promise<NotificationHistory[]> {
    return this.prisma.notificationHistory.findMany({
      where: {
        userId: params.userId,
      },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  /**
   * Counts notification history records matching filter.
   */
  async countHistories(params: { userId?: string }): Promise<number> {
    return this.prisma.notificationHistory.count({
      where: {
        userId: params.userId,
      },
    });
  }

  /**
   * Lazy-loads or inserts a user preference profile.
   */
  async findPreferencesByUserId(userId: string): Promise<UserPreference> {
    const preferences = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (preferences) {
      return preferences;
    }

    // Default setup
    return this.prisma.userPreference.create({
      data: {
        userId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        marketingEmailsEnabled: true,
      },
    });
  }

  /**
   * Updates a user preference profile.
   */
  async updatePreferences(userId: string, data: Partial<UserPreference>): Promise<UserPreference> {
    // Ensure preference object exists first
    await this.findPreferencesByUserId(userId);

    return this.prisma.userPreference.update({
      where: { userId },
      data,
    });
  }

  /**
   * Inserts a delivery history audit trail record.
   */
  async createHistory(data: Prisma.NotificationHistoryUncheckedCreateInput): Promise<NotificationHistory> {
    return this.prisma.notificationHistory.create({
      data,
    });
  }
}
