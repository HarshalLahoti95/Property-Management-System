import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuth } from '@/hooks/use-auth';
import {
  NotificationHistoryTable,
  PreferenceForm,
  TestNotificationDialog,
  NotificationHistory,
  NotificationStatus,
} from '../index';

// Mock Auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

describe('Notification Feature Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin-only Visibility Checks', () => {
    it('renders SMTP test notification dialog for ADMIN users', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'admin-1', role: 'ADMIN', email: 'admin@pms.com' },
      });
      render(
        <TestNotificationDialog
          open={true}
          onOpenChange={() => {}}
          onSubmit={() => {}}
        />
      );
      expect(screen.getByText('Send Test SMTP Notification')).toBeInTheDocument();
    });

    it('hides/omits SMTP test notification dialog for non-ADMIN users', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'tenant-1', role: 'TENANT', email: 'tenant@pms.com' },
      });
      const { container } = render(
        <TestNotificationDialog
          open={true}
          onOpenChange={() => {}}
          onSubmit={() => {}}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('PreferenceForm Toggles', () => {
    const mockPreferences = {
      id: 'pref-1',
      userId: 'user-1',
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      marketingEmailsEnabled: false,
      createdAt: '',
      updatedAt: '',
    };

    it('renders switches with active configurations and fires toggle action', () => {
      const handleToggle = jest.fn();
      render(
        <PreferenceForm
          preferences={mockPreferences}
          onToggle={handleToggle}
        />
      );

      const emailSwitch = screen.getByLabelText('Email Notifications');
      expect(emailSwitch).toBeChecked();

      const smsSwitch = screen.getByLabelText('SMS Text Messages');
      expect(smsSwitch).not.toBeChecked();

      fireEvent.click(smsSwitch);
      expect(handleToggle).toHaveBeenCalledWith('smsEnabled', true);
    });
  });

  describe('NotificationHistoryTable and Empty States', () => {
    it('renders empty history placeholder text on empty array', () => {
      render(
        <NotificationHistoryTable
          notifications={[]}
          loading={false}
          page={1}
          totalPages={1}
        />
      );
      expect(screen.getByText('No notification logs found.')).toBeInTheDocument();
    });

    const mockNotifications = [
      {
        id: 'n-1',
        userId: 'user-1',
        recipient: 'test@pms.com',
        subject: 'Lease Renewal Prompt',
        template: 'LEASE_RENEWAL',
        status: 'SENT' as NotificationStatus,
        provider: 'smtp',
        retryCount: 0,
        deliveryResult: 'Success',
        createdAt: '2026-07-05T00:00:00.000Z',
      },
    ] as unknown as NotificationHistory[];

    it('renders history logs lists when data is loaded', () => {
      render(
        <NotificationHistoryTable
          notifications={mockNotifications}
          loading={false}
          page={1}
          totalPages={1}
        />
      );
      expect(screen.getByText('Lease Renewal Prompt')).toBeInTheDocument();
      expect(screen.getByText('test@pms.com')).toBeInTheDocument();
      expect(screen.getByText('Sent')).toBeInTheDocument();
    });
  });
});
