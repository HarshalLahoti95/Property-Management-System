/* eslint-disable */
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import {
  DocumentTable,
  DocumentCard,
  DocumentUploadDialog,
  AttachmentDialog,
  VersionHistory,
} from '../index';

// Mock Auth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
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

describe('Document Feature Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'landlord-1', role: 'LANDLORD', fullName: 'Landlord Master' },
    });
  });

  describe('DocumentTable & CategoryBadge', () => {
    const mockDocs = [
      {
        id: 'doc-1',
        category: 'LEASE_AGREEMENT' as any,
        fileName: 'lease_agreement_2026.pdf',
        fileKey: 'key-1',
        fileSize: 1048576, // 1MB
        mimeType: 'application/pdf',
        uploadedById: 'landlord-1',
        parentId: null,
        createdAt: '2026-07-05T00:00:00.000Z',
        updatedAt: '2026-07-05T00:00:00.000Z',
        uploadedBy: { id: 'landlord-1', fullName: 'Landlord Master', email: 'landlord@pms.com', role: 'LANDLORD' },
      },
    ];

    it('renders document rows and formats file sizes to MB', () => {
      render(
        <DocumentTable
          documents={mockDocs as any}
          loading={false}
          page={1}
          totalPages={1}
        />
      );
      expect(screen.getByText('lease_agreement_2026.pdf')).toBeInTheDocument();
      expect(screen.getByText('1 MB')).toBeInTheDocument();
      expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
    });
  });

  describe('VersionHistory Sorting Order', () => {
    const mockVersions = [
      {
        id: 'v-1',
        documentId: 'doc-1',
        versionNumber: 1,
        fileName: 'contract_draft_v1.docx',
        fileKey: 'key-v1',
        fileSize: 51200,
        mimeType: 'application/docx',
        uploadedById: 'landlord-1',
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'v-2',
        documentId: 'doc-1',
        versionNumber: 2,
        fileName: 'contract_draft_final.docx',
        fileKey: 'key-v2',
        fileSize: 61440,
        mimeType: 'application/docx',
        uploadedById: 'landlord-1',
        createdAt: '2026-07-05T00:00:00.000Z',
      },
    ];

    it('sorts versions in descending order showing the latest version on top', () => {
      render(<VersionHistory versions={mockVersions} />);
      const headings = screen.getAllByText(/contract_draft/);
      expect(headings[0]).toHaveTextContent('contract_draft_final.docx');
      expect(headings[1]).toHaveTextContent('contract_draft_v1.docx');
    });
  });

  describe('AttachmentDialog and Detach Triggers', () => {
    const mockAttachments = [
      {
        id: 'attach-1',
        documentId: 'doc-1',
        entityType: 'LEASE' as any,
        entityId: 'lease-uuid-xyz',
        attachedById: 'landlord-1',
        attachedAt: '2026-07-05T00:00:00.000Z',
      },
    ];

    it('lists active links and calls detach callback', () => {
      const handleDetach = jest.fn();
      render(
        <AttachmentDialog
          open={true}
          onOpenChange={() => {}}
          onSubmit={() => {}}
          onDetach={handleDetach}
          attachments={mockAttachments}
        />
      );

      expect(screen.getByText('LEASE')).toBeInTheDocument();
      expect(screen.getByText('lease-uuid-xyz')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /detach/i }));
      expect(handleDetach).toHaveBeenCalledWith({
        entityType: 'LEASE',
        entityId: 'lease-uuid-xyz',
      });
    });
  });

  describe('DocumentUploadDialog', () => {
    it('validates missing file attachment on submit', async () => {
      const handleUpload = jest.fn();
      render(
        <DocumentUploadDialog
          open={true}
          onOpenChange={() => {}}
          onSubmit={handleUpload}
          submitting={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /upload document/i }));
      await waitFor(() => {
        expect(screen.getByText('Please select a file to upload.')).toBeInTheDocument();
      });
      expect(handleUpload).not.toHaveBeenCalled();
    });
  });
});
