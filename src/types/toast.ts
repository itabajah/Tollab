/**
 * Toast notification types for the Tollab academic management app.
 */

/** Toast notification severity levels. */
export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

/** Options for showing a toast notification. */
export interface ToastOptions {
  /** Additional description text displayed below the main message. */
  description?: string;
  /** Auto-dismiss duration in milliseconds. 0 or undefined uses the default. */
  duration?: number;
  /** When true, the toast does not auto-dismiss. */
  persistent?: boolean;
  /** When false, hides the animated progress bar. */
  progress?: boolean;
  /** Label for an optional action button. */
  actionLabel?: string;
  /** Callback invoked when the action button is clicked. */
  action?: () => void;
}
