/**
 * Confirm dialog — returns Promise<boolean>.
 * Keyboard: Enter confirms, Escape cancels.
 */

import { useCallback, useEffect, useRef } from 'preact/hooks';

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  description?: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  dangerous?: boolean;
  onResolve: (result: boolean) => void;
}

export function ConfirmDialog({
  isOpen,
  message,
  description,
  title = 'Confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  dangerous = false,
  onResolve,
}: ConfirmDialogProps) {
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
      if (e.key === 'Escape') {
        onResolve(false);
      } else if (e.key === 'Enter') {
        onResolve(true);
      }
    },
    [onResolve],
  );

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === overlayRef.current) onResolve(false);
    },
    [onResolve],
  );

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay active"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="modal confirm-dialog-modal" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body">
          <p className="confirm-dialog-message">{message}</p>
          {description && <p className="confirm-dialog-description">{description}</p>}
        </div>
        <div className="modal-actions confirm-dialog-actions">
          <button
            className="btn-secondary confirm-dialog-cancel"
            type="button"
            onClick={() => onResolve(false)}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            className={`${dangerous ? 'btn-danger' : 'btn-primary'} confirm-dialog-confirm`}
            type="button"
            onClick={() => onResolve(true)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
