/**
 * Alert dialog — returns Promise<void>.
 * OK button only. Keyboard: Enter or Escape dismisses.
 */

import { useCallback, useEffect, useRef } from 'preact/hooks';
import { useFocusTrap } from './useFocusTrap';
import { ErrorIcon, InfoIcon, SuccessIcon, WarningIcon } from '@/components/icons';
import type { JSX } from 'preact';

/** JSX icon components for alert types. */
const ALERT_ICONS: Record<string, (props: { size?: number }) => JSX.Element> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
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
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const { handleTabKey } = useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => confirmBtnRef.current?.focus());
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onResolve();
        return;
      }
      handleTabKey(e);
    },
    [onResolve, handleTabKey],
  );

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === overlayRef.current) onResolve();
    },
    [onResolve],
  );

  if (!isOpen) return null;

  const IconComponent = ALERT_ICONS[type] ?? ALERT_ICONS['info']!;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay active"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        className={`modal alert-dialog-modal alert-dialog-${type}`}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div className="alert-dialog-icon"><IconComponent /></div>
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
