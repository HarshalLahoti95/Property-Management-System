import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { reportingKeys } from '../hooks/reportingKeys';
import { parseContentDispositionFilename } from '../utils/csv-export';
import { OccupancyChart } from '../components/charts/OccupancyChart';
import { RevenueChart } from '../components/charts/RevenueChart';
import { MaintenanceChart } from '../components/charts/MaintenanceChart';
import { CollectionRateChart } from '../components/charts/CollectionRateChart';
import DashboardPage from '@/app/dashboard/page';

// Mock useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

// Mock reporting service API calls
jest.mock('../services/reporting.service', () => ({
  reportingService: {
    getSummary: jest.fn().mockResolvedValue({
      occupancyRate: 85.5,
      occupiedUnits: 17,
      totalUnits: 20,
      totalCharged: 20000,
      totalPaid: 18000,
      outstandingBalance: 2000,
      collectionRate: 90,
      openWorkOrders: 5,
      emergencyWorkOrders: 1,
    }),
    getOccupancy: jest.fn().mockResolvedValue({
      occupiedUnits: 17,
      totalUnits: 20,
      occupancyRate: 85.5,
      expirationsNext30Days: [
        { leaseId: 'l-1', property: 'Sunset Towers', unit: '101', endDate: '2026-08-01T00:00:00.000Z', tenants: ['Alice'] },
      ],
    }),
    getFinancials: jest.fn().mockResolvedValue({
      totalCharged: 20000,
      totalPaid: 18000,
      outstanding: 2000,
      collectionRate: 90,
      paymentTrends: [
        { month: '2026-06', amount: 18000 },
        { month: '2026-07', amount: 18000 },
      ],
    }),
    getMaintenance: jest.fn().mockResolvedValue({
      countByStatus: { SUBMITTED: 1, IN_PROGRESS: 2, RESOLVED: 2 },
      countByPriority: { LOW: 1, MEDIUM: 2, HIGH: 1, EMERGENCY: 1 },
      averageCompletionTimeDays: 4.5,
      totalEstimatedCost: 1500,
      totalActualCost: 1200,
    }),
  },
}));

// Mock other features for TenantDashboard rendering
jest.mock('@/features/lease/hooks/use-lease', () => ({
  useLeases: jest.fn().mockReturnValue({
    data: {
      data: [
        {
          id: 'lease-123',
          status: 'ACTIVE',
          monthlyRent: 1500,
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
          unit: { name: 'Apt 101', property: { name: 'Sunset Apts' } },
        },
      ],
    },
    isLoading: false,
  }),
}));

jest.mock('@/features/payment/hooks/use-payment', () => ({
  usePayments: jest.fn().mockReturnValue({
    data: {
      data: [{ id: 'p-1', amount: 1500, paymentDate: '2026-07-01T00:00:00.000Z', status: 'CLEARED' }],
    },
    isLoading: false,
  }),
}));

jest.mock('@/features/maintenance/hooks/use-maintenance', () => ({
  useWorkOrders: jest.fn().mockReturnValue({
    data: {
      data: [{ id: 'wo-1', title: 'Leaky faucet', status: 'IN_PROGRESS' }],
    },
    isLoading: false,
  }),
}));

jest.mock('@/features/document/hooks/use-document', () => ({
  useDocuments: jest.fn().mockReturnValue({
    data: {
      data: [{ id: 'doc-1', title: 'Lease Agreement Copy', category: 'LEASE' }],
    },
    isLoading: false,
  }),
}));

describe('Sprint 7 Reporting & Analytics Tests', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  describe('Query Keys & Prefetch', () => {
    it('generates standard hierarchical query keys', () => {
      expect(reportingKeys.summary()).toEqual(['reporting', 'summary']);
      expect(reportingKeys.occupancy({ filter: 'p-1' })).toEqual(['reporting', 'occupancy', { filter: 'p-1' }]);
    });
  });

  describe('CSV Filename Generation Utility', () => {
    it('correctly extracts filename from content-disposition header', () => {
      const header = 'attachment; filename="leases-report-1234.csv"';
      const filename = parseContentDispositionFilename(header);
      expect(filename).toBe('leases-report-1234.csv');
    });

    it('falls back to default filename when header is missing or malformed', () => {
      expect(parseContentDispositionFilename(undefined, 'fallback.csv')).toBe('fallback.csv');
      expect(parseContentDispositionFilename('inline', 'fallback.csv')).toBe('fallback.csv');
    });
  });

  describe('Custom SVG Charts & Accessibility', () => {
    it('renders OccupancyChart with visual donut and accessible descriptions', () => {
      render(<OccupancyChart occupiedUnits={16} totalUnits={20} />);
      expect(screen.getByText('Occupancy Rate')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('16 units (80%)')).toBeInTheDocument();
      expect(screen.getByText('4 units (20%)')).toBeInTheDocument();
      expect(screen.getAllByText(/Total portfolio size/i).length).toBeGreaterThan(0);
    });

    it('renders RevenueChart area lines and points', () => {
      const paymentTrends = [
        { month: '2026-06', amount: 15000 },
        { month: '2026-07', amount: 18000 },
      ];
      render(<RevenueChart paymentTrends={paymentTrends} />);
      expect(screen.getByText('Monthly Revenue History')).toBeInTheDocument();
      expect(screen.getAllByText(/Jun/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Jul/i).length).toBeGreaterThan(0);
    });

    it('renders MaintenanceChart bars', () => {
      const countByStatus = { SUBMITTED: 1, IN_PROGRESS: 3, RESOLVED: 4 };
      render(<MaintenanceChart countByStatus={countByStatus} countByPriority={{}} />);
      expect(screen.getByText('Maintenance Status Distributions')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders CollectionRateChart gauge', () => {
      render(<CollectionRateChart collectionRate={92.5} totalCharged={10000} totalPaid={9250} />);
      expect(screen.getByText('Rent Collection Rate')).toBeInTheDocument();
      expect(screen.getByText('92.5%')).toBeInTheDocument();
      expect(screen.getByText('$10,000')).toBeInTheDocument();
      expect(screen.getByText('$9,250')).toBeInTheDocument();
    });
  });

  describe('Role-Based Dashboard Switcher', () => {
    it('renders AdminDashboard for ADMIN role users', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'admin-1', role: 'ADMIN', fullName: 'Admin User' },
      });

      render(<DashboardPage />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Admin Global Dashboard')).toBeInTheDocument();
        expect(screen.getByText('85.5%')).toBeInTheDocument();
        expect(screen.getAllByText('$18,000')[0]).toBeInTheDocument();
      });
    });

    it('renders LandlordDashboard for LANDLORD role users', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'landlord-1', role: 'LANDLORD', fullName: 'Landlord User' },
      });

      render(<DashboardPage />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Landlord Portfolio Overview')).toBeInTheDocument();
        expect(screen.getByText('85.5%')).toBeInTheDocument();
      });
    });

    it('renders TenantDashboard for TENANT role users without querying reports summary API', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'tenant-1', role: 'TENANT', fullName: 'Tenant User' },
      });

      render(<DashboardPage />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('Tenant Portal')).toBeInTheDocument();
        expect(screen.getByText('Sunset Apts — Unit Apt 101')).toBeInTheDocument();
        expect(screen.getByText('$1,500 /mo')).toBeInTheDocument();
        expect(screen.getByText('Leaky faucet')).toBeInTheDocument();
        expect(screen.getByText('Lease Agreement Copy')).toBeInTheDocument();
      });
    });
  });
});
