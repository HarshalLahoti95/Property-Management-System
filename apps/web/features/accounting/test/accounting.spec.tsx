import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeaseFinancialSummary } from '../components/LeaseFinancialSummary';
import { LedgerHistoryTable } from '../components/LedgerHistoryTable';
import { ChargeTable } from '../components/ChargeTable';
import { ChargeForm } from '../components/ChargeForm';
import { ChargeDetailsDialog } from '../components/ChargeDetailsDialog';
import { useAuth } from '@/hooks/use-auth';
import { ChargeType, LedgerType, ChargeStatus } from '../types';

import { Lease } from '@/features/lease/types';

// Mock dependencies
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Accounting Feature Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', role: 'ADMIN', fullName: 'Admin User' },
    });
  });

  describe('LeaseFinancialSummary', () => {
    const mockSummary = {
      operatingBalance: 1250.5,
      trustBalance: 1500,
      outstandingCharges: [],
      nextDueCharge: {
        id: 'c-1',
        type: 'RENT' as ChargeType,
        amount: 1200,
        dueDate: '2026-07-05T00:00:00.000Z',
      },
      chargeCounts: {
        PAID: 5,
        UNPAID: 2,
        PARTIALLY_PAID: 1,
        VOIDED: 0,
      },
    };

    const mockLedgers = [
      {
        id: 'led-1',
        leaseId: 'lease-1',
        ledgerType: 'OPERATING' as LedgerType,
        runningBalance: 1250.5,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ];

    it('should correctly render ledger balances and summary metrics', () => {
      render(
        <LeaseFinancialSummary
          summary={mockSummary}
          ledgers={mockLedgers}
        />,
        { wrapper }
      );

      expect(screen.getByText('Operating Ledger')).toBeInTheDocument();
      expect(screen.getByText('$1,250.50')).toBeInTheDocument();
      expect(screen.getByText('Next Scheduled Due Charge')).toBeInTheDocument();
      expect(screen.getByText('rent')).toBeInTheDocument();
      expect(screen.getByText('$1200.00')).toBeInTheDocument();
      expect(screen.getByText('Charge Activity Counts')).toBeInTheDocument();
    });
  });

  describe('LedgerHistoryTable', () => {
    it('should render history rows correctly', () => {
      const mockHistory = [
        {
          id: 'hist-1',
          ledgerId: 'led-1',
          oldBalance: 1000,
          newBalance: 1200,
          triggerEventType: 'CHARGE',
          triggerEventId: 'c-1',
          createdAt: '2026-07-01T12:00:00.000Z',
        },
      ];

      render(
        <LedgerHistoryTable
          histories={mockHistory}
          loading={false}
          page={1}
          totalPages={1}
        />,
        { wrapper }
      );

      expect(screen.getByText('CHARGE')).toBeInTheDocument();
      expect(screen.getByText('$1000.00')).toBeInTheDocument();
      expect(screen.getByText('$1200.00')).toBeInTheDocument();
      expect(screen.getByText('+$200.00')).toBeInTheDocument();
    });

    it('should display empty state when histories array is empty', () => {
      render(
        <LedgerHistoryTable
          histories={[]}
          loading={false}
        />,
        { wrapper }
      );
      expect(screen.getByText('No ledger history recorded.')).toBeInTheDocument();
    });
  });

  describe('ChargeTable', () => {
    const mockCharges = [
      {
        id: 'c-1',
        ledgerId: 'led-1',
        dueDate: '2026-07-01T00:00:00.000Z',
        type: 'RENT' as ChargeType,
        amount: 1500,
        paidAmount: 500,
        status: 'PARTIALLY_PAID' as ChargeStatus,
        description: 'Rent for July',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ];

    it('should render charges lists', () => {
      render(
        <ChargeTable
          charges={mockCharges}
          loading={false}
          onSelectCharge={() => {}}
        />,
        { wrapper }
      );

      expect(screen.getByText('Rent for July')).toBeInTheDocument();
      expect(screen.getByText('$1500.00')).toBeInTheDocument();
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('Partially Paid')).toBeInTheDocument();
    });

    it('should render empty state when charges array is empty', () => {
      render(
        <ChargeTable
          charges={[]}
          loading={false}
        />,
        { wrapper }
      );
      expect(screen.getByText('No ledger charges found.')).toBeInTheDocument();
    });
  });

  describe('ChargeForm', () => {
    const mockLeases = [
      {
        id: 'lease-1',
        unit: {
          id: 'unit-1',
          name: '404',
          property: {
            id: 'prop-1',
            name: 'Sunset Apartments',
          },
        },
      },
    ];

    it('should show validations for missing values', async () => {
      render(<ChargeForm leases={mockLeases as unknown as Lease[]} onSubmit={() => {}} />, { wrapper });

      fireEvent.click(screen.getByRole('button', { name: /create charge/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid Lease reference.')).toBeInTheDocument();
        expect(screen.getByText('Please provide a description.')).toBeInTheDocument();
      });
    });
  });

  describe('ChargeDetailsDialog & Permissions', () => {
    const mockCharge = {
      id: 'c-1',
      ledgerId: 'led-1',
      dueDate: '2026-07-01T00:00:00.000Z',
      type: 'RENT' as ChargeType,
      amount: 1500,
      paidAmount: 0,
      status: 'UNPAID' as ChargeStatus,
      description: 'Rent for July',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };

    it('should render action buttons for landlords or admins', () => {
      render(
        <ChargeDetailsDialog
          charge={mockCharge}
          open={true}
          onOpenChange={() => {}}
        />,
        { wrapper }
      );

      expect(screen.getByRole('button', { name: /void charge/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply credit/i })).toBeInTheDocument();
    });

    it('should hide action buttons for tenants', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'tenant-1', role: 'TENANT', fullName: 'Tenant User' },
      });

      render(
        <ChargeDetailsDialog
          charge={mockCharge}
          open={true}
          onOpenChange={() => {}}
        />,
        { wrapper }
      );

      expect(screen.queryByRole('button', { name: /void charge/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /apply credit/i })).not.toBeInTheDocument();
    });
  });
});
