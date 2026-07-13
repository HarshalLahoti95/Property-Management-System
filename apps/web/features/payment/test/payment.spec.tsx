import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaymentTable } from '../components/PaymentTable';
import { PaymentForm } from '../components/PaymentForm';
import { PaymentCard } from '../components/PaymentCard';
import { PaymentAllocationTable } from '../components/PaymentAllocationTable';
import { RefundDialog } from '../components/RefundDialog';
import { useAuth } from '@/hooks/use-auth';
import { useLedgersByLease } from '@/features/accounting';
import { PaymentMethod, PaymentStatus } from '../types';
import { Lease } from '@/features/lease/types';

// Mock hooks and API
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/accounting', () => ({
  useLedgersByLease: jest.fn(),
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

describe('Payment Feature Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'user-1', role: 'ADMIN', fullName: 'Admin User' },
    });
    (useLedgersByLease as jest.Mock).mockReturnValue({
      data: [{ id: 'led-1', ledgerType: 'OPERATING' }],
      isLoading: false,
    });
  });

  describe('PaymentTable', () => {
    const mockPayments = [
      {
        id: 'pay-1',
        ledgerId: 'led-1',
        tenantId: 'tenant-1',
        amount: 1200,
        paymentMethod: 'ACH' as PaymentMethod,
        transactionReference: 'TXN-ABC',
        status: 'CLEARED' as PaymentStatus,
        paymentDate: '2026-07-01T00:00:00.000Z',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        tenant: { id: 'tenant-1', fullName: 'John Doe', email: 'john@example.com' },
      },
    ];

    it('should render payments list correctly', () => {
      render(
        <PaymentTable
          payments={mockPayments}
          loading={false}
        />,
        { wrapper }
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('$1200.00')).toBeInTheDocument();
      expect(screen.getByText('TXN-ABC')).toBeInTheDocument();
      expect(screen.getByText('Cleared')).toBeInTheDocument();
    });

    it('should render empty state when payments array is empty', () => {
      render(
        <PaymentTable
          payments={[]}
          loading={false}
        />,
        { wrapper }
      );
      expect(screen.getByText('No payments submitted.')).toBeInTheDocument();
    });
  });

  describe('PaymentForm', () => {
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

    it('should validate form and show error for missing fields', async () => {
      render(
        <PaymentForm
          leases={mockLeases as unknown as Lease[]}
          onSubmit={() => {}}
        />,
        { wrapper }
      );

      fireEvent.click(screen.getByRole('button', { name: /submit payment/i }));

      await waitFor(() => {
        expect(screen.getByText('Please select a lease agreement.')).toBeInTheDocument();
        expect(screen.getByText('Transaction reference is required.')).toBeInTheDocument();
      });
    });
  });

  describe('PaymentCard & Permission Render', () => {
    const mockPayment = {
      id: 'pay-1',
      ledgerId: 'led-1',
      tenantId: 'tenant-1',
      amount: 1200,
      paymentMethod: 'ACH' as PaymentMethod,
      transactionReference: 'TXN-ABC',
      status: 'CLEARED' as PaymentStatus,
      paymentDate: '2026-07-01T00:00:00.000Z',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      tenant: { id: 'tenant-1', fullName: 'John Doe', email: 'john@example.com' },
    };

    it('should display issue refund button for landlords or admins', () => {
      render(
        <PaymentCard payment={mockPayment} />,
        { wrapper }
      );
      expect(screen.getByRole('button', { name: /issue refund/i })).toBeInTheDocument();
    });

    it('should hide issue refund button for tenants', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'tenant-1', role: 'TENANT', fullName: 'Tenant User' },
      });

      render(
        <PaymentCard payment={mockPayment} />,
        { wrapper }
      );
      expect(screen.queryByRole('button', { name: /issue refund/i })).not.toBeInTheDocument();
    });
  });

  describe('PaymentAllocationTable', () => {
    it('should display list of payment allocations correctly', () => {
      const mockAllocations = [
        {
          id: 'alloc-1',
          paymentId: 'pay-1',
          rentChargeId: 'c-1',
          amountAllocated: 1200,
          allocatedAt: '2026-07-01T12:00:00.000Z',
          rentCharge: {
            id: 'c-1',
            type: 'RENT',
            amount: 1200,
            description: 'Rent charge for July',
          },
        },
      ];

      render(
        <PaymentAllocationTable
          allocations={mockAllocations}
          loading={false}
        />,
        { wrapper }
      );

      expect(screen.getByText('rent')).toBeInTheDocument();
      expect(screen.getByText('Rent charge for July')).toBeInTheDocument();
      expect(screen.getByText('$1200.00')).toBeInTheDocument();
    });

    it('should show empty state when there are no allocations', () => {
      render(
        <PaymentAllocationTable
          allocations={[]}
          loading={false}
        />,
        { wrapper }
      );
      expect(screen.getByText(/No payment allocations found./i)).toBeInTheDocument();
    });
  });

  describe('RefundDialog', () => {
    it('should validate that refund reason is required', async () => {
      render(
        <RefundDialog
          open={true}
          onOpenChange={() => {}}
          onSubmit={() => {}}
          maxAmount={1200}
        />,
        { wrapper }
      );

      fireEvent.click(screen.getByRole('button', { name: /issue refund/i }));

      await waitFor(() => {
        expect(screen.getByText('Refund reason is required.')).toBeInTheDocument();
      });
    });
  });
});
