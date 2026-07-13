/* eslint-disable */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import { notificationKeys } from './notificationKeys';
import { UserPreference, NotificationHistory } from '../types';
import { PreferenceFormValues, TestNotificationFormValues } from '../schemas';

export function useNotifications(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: notificationKeys.history(filters),
    queryFn: () => notificationService.getNotifications(filters),
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationService.getNotification(id),
    enabled: !!id,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationService.getPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PreferenceFormValues) => notificationService.updatePreferences(values),
    onMutate: async (newValues) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences() });

      const previousPreferences = queryClient.getQueryData<UserPreference>(
        notificationKeys.preferences()
      );
      if (previousPreferences) {
        queryClient.setQueryData<UserPreference>(notificationKeys.preferences(), {
          ...previousPreferences,
          ...newValues,
        });
      }

      return { previousPreferences };
    },
    onError: (err, newValues, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(notificationKeys.preferences(), context.previousPreferences);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}

export function useSendTestNotification() {
  return useMutation({
    mutationFn: (values: TestNotificationFormValues) =>
      notificationService.sendTestNotification(values),
  });
}
