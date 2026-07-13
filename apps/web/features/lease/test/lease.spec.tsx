import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LeaseStatusTimeline } from '../components/LeaseStatusTimeline';
import { LeaseHistoryTable } from '../components/LeaseHistoryTable';
import { LeaseTenantSelector } from '../components/LeaseTenantSelector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: [] }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Lease UI Components', () => {
  describe('LeaseStatusTimeline', () => {
    it('should correctly render status steps', () => {
      render(<LeaseStatusTimeline currentStatus="ACTIVE" />);
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  describe('LeaseHistoryTable', () => {
    it('should list transition histories rows', () => {
      const mockHistories: any[] = [
        {
          id: 'h-1',
          oldStatus: 'DRAFT',
          newStatus: 'ACTIVE',
          changedByUser: { fullName: 'Landlord User' },
          reasonDescription: 'Activated contract',
          changedAt: '2026-07-01T00:00:00.000Z',
        },
      ];
      render(<LeaseHistoryTable histories={mockHistories} />);
      expect(screen.getByText('Landlord User')).toBeInTheDocument();
      expect(screen.getByText('Activated contract')).toBeInTheDocument();
    });
  });

  describe('LeaseTenantSelector', () => {
    it('should render and select checkbox', async () => {
      const onChange = jest.fn();
      render(<LeaseTenantSelector value={[]} onChange={onChange} />, { wrapper });
      await waitFor(() => {
        expect(screen.queryByText('Loading tenants list...')).not.toBeInTheDocument();
      });
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(onChange).toHaveBeenCalled();
    });
  });
});
