/**
 * Individual toast notification component.
 * Renders icon, message, optional action, close button, and progress bar.
 * Hover pauses auto-dismiss timer.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { ToastType } from '@/types';
import type { ToastOptions } from '@/types';

/** SVG icons matching the legacy toast.js exactly. */
const TOAST_ICONS: Record<ToastType, string> = {
  [ToastType.Success]: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  [ToastType.Error]: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  [ToastType.Warning]: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  [ToastType.Info]: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
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
      <div className="toast-icon" dangerouslySetInnerHTML={{ __html: TOAST_ICONS[type] }} />
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
