'use client';
import * as React from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (msg: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const addToast = React.useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastRegion toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Variant styling ──────────────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, { bar: string; icon: string; label: string }> = {
  info:    { bar: '#6366f1', icon: 'ℹ',  label: 'Info' },
  success: { bar: '#22c55e', icon: '✓',  label: 'Success' },
  warning: { bar: '#f59e0b', icon: '⚠',  label: 'Warning' },
  error:   { bar: '#ef4444', icon: '✕',  label: 'Error' },
};

// ─── Region (portal anchor, fixed bottom-right) ───────────────────────────────

function ToastRegion({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '22rem',
        width: '100%',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const vs = variantStyles[toast.variant];
  const [visible, setVisible] = React.useState(false);

  // Animate in
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '0.5rem',
        padding: '0.875rem 1rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(0.75rem)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        borderLeft: `4px solid ${vs.bar}`,
      }}
    >
      <span
        style={{
          fontSize: '1rem',
          color: vs.bar,
          lineHeight: 1,
          marginTop: '0.1rem',
          flexShrink: 0,
        }}
      >
        {vs.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--foreground)',
          }}
        >
          {toast.title}
        </p>
        {toast.description && (
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.8125rem',
              color: 'var(--muted-foreground)',
              lineHeight: 1.45,
            }}
          >
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted-foreground)',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0.125rem',
          flexShrink: 0,
          marginTop: '0.1rem',
        }}
      >
        ×
      </button>
    </div>
  );
}
