/**
 * Individual toast notification component.
 * Renders icon, message, optional action, close button, and progress bar.
 * Hover pauses auto-dismiss timer.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { ToastType } from '@/types';
import type { ToastOptions } from '@/types';
import { ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from '@/components/icons';
import type { JSX } from 'preact';

/** JSX icon components matching the legacy toast.js exactly. */
const TOAST_ICONS: Record<ToastType, (props: { size?: number }) => JSX.Element> = {
  [ToastType.Success]: SuccessIcon,
  [ToastType.Error]: ErrorIcon,
  [ToastType.Warning]: WarningIcon,
  [ToastType.Info]: InfoIcon,
};

/** CSS class per toast type (from toast.css). */
const TYPE_CLASS: Record<ToastType, string> = {
  [ToastType.Success]: 'toast-success',
  [ToastType.Error]: 'toast-error',
  [ToastType.Warning]: 'toast-warning',
  [ToastType.Info]: 'toast-info',
};

/** Animation duration for slide out (ms) — matches toast.css transition. */
const ANIMATION_DURATION = 300;

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  options: ToastOptions;
  duration: number;
  onDismiss: (id: string) => void;
}

export function Toast({ id, type, message, options, duration, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(duration);
  const startRef = useRef(0);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const shouldAutoDismiss = duration > 0 && !options.persistent;
  const showProgress = options.progress !== false && shouldAutoDismiss;

  const dismiss = useCallback(() => {
    if (hiding) return;
    setHiding(true);
    setTimeout(() => onDismiss(id), ANIMATION_DURATION);
  }, [id, onDismiss, hiding]);

  // Start auto-dismiss timer
  const startTimer = useCallback(() => {
    if (!shouldAutoDismiss) return;
    startRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, remainingRef.current);
    // Resume progress bar animation
    if (progressRef.current) {
      const fraction = remainingRef.current / duration;
      progressRef.current.style.animationDuration = `${remainingRef.current}ms`;
      progressRef.current.style.animationDelay = '0ms';
      progressRef.current.style.animationPlayState = 'running';
      // Scale from the remaining fraction
      progressRef.current.style.transform = `scaleX(${fraction})`;
      // Use custom animation from remaining point
      progressRef.current.style.animation = `toast-progress ${remainingRef.current}ms linear forwards`;
    }
  }, [shouldAutoDismiss, dismiss, duration]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }
    if (progressRef.current) {
      progressRef.current.style.animationPlayState = 'paused';
    }
  }, []);

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Start auto-dismiss once visible
  useEffect(() => {
    if (visible && !hiding) {
      startTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, hiding, startTimer]);

  const handleAction = useCallback(() => {
    options.action?.();
    dismiss();
  }, [options, dismiss]);

  const hasAction = !!(options.action && options.actionLabel);

  const className = [
    'toast',
    TYPE_CLASS[type],
    visible && !hiding ? 'toast-visible' : '',
    hiding ? 'toast-hiding' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      role="alert"
      aria-live={type === ToastType.Error ? 'assertive' : 'polite'}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
    >
      <div className="toast-icon">{(() => { const Icon = TOAST_ICONS[type]; return <Icon />; })()}</div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
        {options.description && <div className="toast-description">{options.description}</div>}
      </div>
      {hasAction && (
        <button className="toast-action" type="button" onClick={handleAction}>
          {options.actionLabel}
        </button>
      )}
      <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={dismiss}>
        &times;
      </button>
      {showProgress && (
        <div
          ref={progressRef}
          className="toast-progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
}
