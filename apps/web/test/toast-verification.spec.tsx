import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Providers } from '../providers/Providers';
import { useToast } from '@/components/ui/toast';

// A dummy component to simulate exactly what DisbursementsPage and WorkOrderCard do
function DummyComponent() {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast({ title: 'Success!', description: 'Toast rendered safely.', variant: 'success' })}>
      Trigger Toast
    </button>
  );
}

describe('ToastProvider Integration', () => {
  it('allows useToast to be called without crashing when wrapped in global Providers', () => {
    // If Providers does not correctly render ToastProvider, mounting this will throw the "useToast must be used inside <ToastProvider>" error.
    expect(() => {
      render(
        <Providers>
          <DummyComponent />
        </Providers>
      );
    }).not.toThrow();
  });

  it('renders the actual toast element into the DOM when triggered', async () => {
    render(
      <Providers>
        <DummyComponent />
      </Providers>
    );

    // Trigger the toast
    fireEvent.click(screen.getByText('Trigger Toast'));

    // Wait for the toast to appear in the DOM (it has role="alert" in toast.tsx)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Toast rendered safely.')).toBeInTheDocument();
    });
  });
});
