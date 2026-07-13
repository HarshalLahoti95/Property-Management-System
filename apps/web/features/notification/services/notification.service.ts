import { apiClient } from '@/lib/api-client';
import { NotificationHistory, UserPreference } from '../types';
import { PreferenceFormValues, TestNotificationFormValues } from '../schemas';

export const notificationService = {
  async getNotifications(params?: Record<string, unknown>) {
    const { data } = await apiClient.get<{
      data: NotificationHistory[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>('/notifications', { params });
    return data;
  },

  async getNotification(id: string) {
    const { data } = await apiClient.get<NotificationHistory>(`/notifications/${id}`);
    return (data as any)?.data || data;
  },

  async getPreferences() {
    const { data } = await apiClient.get<UserPreference>('/notifications/preferences');
    return (data as any)?.data || data;
  },

  async updatePreferences(values: PreferenceFormValues) {
    const { data } = await apiClient.patch<UserPreference>(
      '/notifications/preferences',
      values
    );
    return data;
  },

  async sendTestNotification(values: TestNotificationFormValues) {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      '/notifications/test',
      values
    );
    return data;
  },
};
