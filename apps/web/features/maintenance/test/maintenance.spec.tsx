import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuth } from '@/hooks/use-auth';
import {
  WorkOrderForm,
  VendorAssignmentDialog,
  StatusTransitionDialog,
  CommentTimeline,
  HistoryTimeline,
  CostSummaryCard,
  PriorityBadge,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderStatusHistory,
} from '../index';

// Mock Auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

describe('Maintenance Feature Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'admin-1', role: 'ADMIN', fullName: 'Admin Landlord' },
    });
  });

  describe('PriorityBadge & Emergency Priority', () => {
    it('renders priority labels properly', () => {
      render(<PriorityBadge priority="LOW" />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('applies pulsing red styles for EMERGENCY priority', () => {
      render(<PriorityBadge priority="EMERGENCY" />);
      const badge = screen.getByText('Emergency');
      expect(badge).toHaveClass('bg-red-100');
    });
  });

  describe('CostSummaryCard', () => {
    const mockWorkOrder = {
      id: 'wo-1',
      estimatedCost: 100,
      actualCost: 120,
    } as unknown as WorkOrder;

    it('calculates and shows budget discrepancy alert', () => {
      render(<CostSummaryCard workOrder={mockWorkOrder} />);
      expect(screen.getByText('Over budget by ₹20.00')).toBeInTheDocument();
    });
  });

  describe('CommentTimeline', () => {
    const mockComments = [
      {
        id: 'c-1',
        workOrderId: 'wo-1',
        authorId: 'auth-1',
        commentText: 'Technician dispatched',
        createdAt: '2026-07-05T12:00:00.000Z',
        author: { id: 'auth-1', fullName: 'Jack Plumber', email: '', role: 'USER' },
      },
    ];

    it('renders comments list timeline', () => {
      render(
        <CommentTimeline
          comments={mockComments}
          onAddComment={() => {}}
          submitting={false}
        />
      );
      expect(screen.getByText('Technician dispatched')).toBeInTheDocument();
      expect(screen.getByText('Jack Plumber')).toBeInTheDocument();
    });

    it('validates empty comment entries', async () => {
      const handleAddComment = jest.fn();
      render(
        <CommentTimeline
          comments={[]}
          onAddComment={handleAddComment}
          submitting={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /post comment/i }));
      await waitFor(() => {
        expect(screen.getByText('Comment text cannot be empty.')).toBeInTheDocument();
      });
      expect(handleAddComment).not.toHaveBeenCalled();
    });
  });

  describe('HistoryTimeline & Reopened History', () => {
    const mockHistory = [
      {
        id: 'h-1',
        workOrderId: 'wo-1',
        oldStatus: 'SUBMITTED' as WorkOrderStatus,
        newStatus: 'ASSIGNED' as WorkOrderStatus,
        changedByUserId: 'user-1',
        reasonDescription: 'Dispatch Electrician',
        changedAt: '2026-07-05T10:00:00.000Z',
        changedByUser: { id: 'user-1', fullName: 'Admin Landlord', email: '' },
      },
    ] as unknown as WorkOrderStatusHistory[];

    it('renders history trail and reason logs', () => {
      render(<HistoryTimeline history={mockHistory} />);
      expect(screen.getByText('Admin Landlord')).toBeInTheDocument();
      expect(screen.getByText('Reason: “Dispatch Electrician”')).toBeInTheDocument();
    });
  });

  describe('WorkOrderForm and Validations', () => {
    it('validates missing values', async () => {
      render(
        <WorkOrderForm
          properties={[]}
          units={[]}
          onSubmit={() => {}}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

      await waitFor(() => {
        expect(screen.getByText('Title is required.')).toBeInTheDocument();
        expect(screen.getByText('Description is required.')).toBeInTheDocument();
      });
    });
  });

  describe('VendorAssignmentDialog & StatusTransitionDialog', () => {
    it('renders contractor dropdown options in vendor assignment dialog', () => {
      render(
        <VendorAssignmentDialog
          open={true}
          onOpenChange={() => {}}
          onSubmit={() => {}}
          submitting={false}
        />
      );
      expect(screen.getByLabelText(/select contractor/i)).toBeInTheDocument();
    });

    it('enforces invalid transitions filtering in status dialog', () => {
      render(
        <StatusTransitionDialog
          open={true}
          onOpenChange={() => {}}
          onSubmit={() => {}}
          currentStatus="SUBMITTED"
        />
      );
      expect(screen.getByText('Assigned')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
      expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
    });
  });
});
