import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { z } from 'zod';
import { CreateDisbursementDialog } from '../components/CreateDisbursementDialog';

// Mock zod resolver similar to payment tests
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: (schema: z.ZodSchema) => async (data: any) => {
    // Workaround for JSDOM / react-hook-form valueAsNumber not firing correctly
    if (data && typeof data.amount === 'string') data.amount = Number(data.amount);
    
    console.log("MOCKED RESOLVER RECEIVED DATA:", data);
    
    try {
      const valid = await schema.parseAsync(data);
      return { values: valid, errors: {} };
    } catch (e: any) {
      if (e.name === 'ZodError') {
        const issues = e.issues || e.errors || [];
        const errors = issues.reduce((acc: any, curr: any) => {
          acc[curr.path[0]] = { type: curr.code, message: curr.message };
          return acc;
        }, {});
        return { values: {}, errors };
      }
      throw e;
    }
  }
}));

describe('CreateDisbursementDialog', () => {
  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an inline error and blocks submission if amount exceeds trustLedgerBalance', async () => {
    render(
      <CreateDisbursementDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        currentAmountOwed={1000}
        trustLedgerBalance={500}
      />
    );

    // Initial render should pre-fill with 500 (Math.min(1000, 500))
    const amountInput = screen.getByLabelText(/Disbursement Amount/i);
    expect(amountInput).toHaveValue(500);

    // Change to 600 (which is > trustLedgerBalance 500)
    fireEvent.change(amountInput, { target: { value: '600', valueAsNumber: 600 } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Submit Disbursement/i });
    fireEvent.click(submitBtn);

    // Wait for validation message from the mocked resolver executing Zod schema
    await waitFor(() => {
      expect(screen.getByText(/Amount cannot exceed available trust funds/i)).toBeInTheDocument();
    });
    
    // Ensure onSubmit was never called
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits successfully with correct payload when amount is valid', async () => {
    render(
      <CreateDisbursementDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        currentAmountOwed={1000}
        trustLedgerBalance={1500}
      />
    );

    // Initial render should pre-fill with 1000 (Math.min(1000, 1500))
    const amountInput = screen.getByLabelText(/Disbursement Amount/i);
    expect(amountInput).toHaveValue(1000);

    // Click submit immediately
    const submitBtn = screen.getByRole('button', { name: /Submit Disbursement/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000, referenceNote: '' }),
        expect.anything()
      );
    });
  });
});
