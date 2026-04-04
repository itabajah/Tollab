/**
 * Fixed-position container that renders the active toast stack.
 * Positioned bottom-right to match the legacy app.
 */

import { useToast } from './ToastContext';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      className="toast-container toast-bottom-right"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((entry) => (
        <Toast
          key={entry.id}
          id={entry.id}
          type={entry.type}
          message={entry.message}
          options={entry.options}
          duration={entry.duration}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
}
