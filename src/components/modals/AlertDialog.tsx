/**
 * Alert dialog — returns Promise<void>.
 * OK button only. Keyboard: Enter or Escape dismisses.
 */

import { useCallback, useEffect, useRef } from 'preact/hooks';

/** Reuse the same SVG icons as the toast system for alert types. */
const ALERT_ICONS: Record<string, string> = {
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
};

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertDialogProps {
  isOpen: boolean;
  message: string;
  description?: string;
  title?: string;
  confirmText?: string;
  type?: AlertType;
  onResolve: () => void;
}

export function AlertDialog({
  isOpen,
  message,
  description,
  title = 'Notice',
  confirmText = 'OK',
  type = 'info',
  onResolve,
}: AlertDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => confirmBtnRef.current?.focus());
    }
    return () => {
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      if (activeModals.length <= 1) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onResolve();
      }
    },
    [onResolve],
  );

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === overlayRef.current) onResolve();
    },
    [onResolve],
  );

  if (!isOpen) return null;

  const iconHtml = ALERT_ICONS[type] ?? ALERT_ICONS['info'] ?? '';

  return (
    <div
      ref={overlayRef}
      className="modal-overlay active"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={`modal alert-dialog-modal alert-dialog-${type}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div className="alert-dialog-icon" dangerouslySetInnerHTML={{ __html: iconHtml }} />
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body">
          <p className="alert-dialog-message">{message}</p>
          {description && <p className="alert-dialog-description">{description}</p>}
        </div>
        <div className="modal-actions alert-dialog-actions">
          <button
            ref={confirmBtnRef}
            className="btn-primary alert-dialog-confirm"
            type="button"
            onClick={onResolve}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { AlertType };
