/**
 * Toast notification context and provider.
 * Provides showToast() and dismissToast() to the component tree.
 */

import { createContext } from 'preact';
import { useCallback, useContext, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ToastType } from '@/types';
import type { ToastOptions } from '@/types';

/** Default auto-dismiss duration in ms. */
const DEFAULT_DURATION = 4000;

/** Duration for error toasts in ms. */
const ERROR_DURATION = 6000;

/** Maximum toasts visible at once. */
const MAX_VISIBLE = 5;

/** Internal toast state for the stack. */
export interface ToastEntry {
  id: string;
  type: ToastType;
  message: string;
  options: ToastOptions;
  duration: number;
  createdAt: number;
}

interface ToastContextValue {
  toasts: readonly ToastEntry[];
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = ToastType.Info, options: ToastOptions = {}): string => {
      const id = `toast-${++toastIdCounter}`;
      const duration =
        options.duration ?? (type === ToastType.Error ? ERROR_DURATION : DEFAULT_DURATION);

      const entry: ToastEntry = { id, type, message, options, duration, createdAt: Date.now() };

      setToasts((prev) => {
        const next = [...prev, entry];
        // Remove oldest if exceeding max
        while (next.length > MAX_VISIBLE) {
          next.shift();
        }
        return next;
      });

      return id;
    },
    [],
  );

  return (
    <ToastCtx.Provider value={{ toasts, showToast, dismissToast }}>{children}</ToastCtx.Provider>
  );
}

/**
 * Hook to show and dismiss toasts from any component.
 *
 * @example
 * const { showToast } = useToast();
 * showToast('Course saved', ToastType.Success);
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}
