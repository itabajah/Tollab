/**
 * Generic modal wrapper component.
 * Provides backdrop overlay, scroll lock, keyboard dismiss, focus trap,
 * and transition animations matching modals.css.
 */

import { useCallback, useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'confirm-dialog-modal',
  md: '',
  lg: 'modal-wide',
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ComponentChildren;
  size?: ModalSize;
  /** Extra CSS class for the .modal element. */
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Scroll lock and focus management
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element
      requestAnimationFrame(() => {
        const el = modalRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        el?.focus();
      });
    }

    return () => {
      // Restore scroll only if no other modals remain
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      if (activeModals.length <= 1) {
        document.body.style.overflow = '';
      }
      // Restore previous focus
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  // Keyboard: Escape to close + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  // Backdrop click
  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const modalClasses = ['modal', SIZE_CLASS[size], className].filter(Boolean).join(' ');

  return (
    <div
      ref={overlayRef}
      className="modal-overlay active"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div ref={modalRef} className={modalClasses} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
