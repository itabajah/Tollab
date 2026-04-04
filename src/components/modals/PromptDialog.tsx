/**
 * Prompt dialog — returns Promise<string | null>.
 * Text input with optional validation.
 * Keyboard: Enter submits, Escape cancels.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

interface PromptDialogProps {
  isOpen: boolean;
  message: string;
  defaultValue?: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  inputType?: string;
  required?: boolean;
  validate?: (value: string) => true | string;
  validationMessage?: string;
  onResolve: (result: string | null) => void;
}

export function PromptDialog({
  isOpen,
  message,
  defaultValue = '',
  title = 'Input Required',
  confirmText = 'OK',
  cancelText = 'Cancel',
  placeholder = '',
  inputType = 'text',
  required = false,
  validate,
  validationMessage: _staticValidation,
  onResolve,
}: PromptDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError(null);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
    return () => {
      const activeModals = document.querySelectorAll('.modal-overlay.active');
      if (activeModals.length <= 1) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, defaultValue]);

  const submit = useCallback(() => {
    const trimmed = value.trim();

    if (validate) {
      const result = validate(trimmed);
      if (result !== true) {
        setError(result || 'Invalid input');
        inputRef.current?.focus();
        return;
      }
    }

    if (required && !trimmed) {
      setError('This field is required');
      inputRef.current?.focus();
      return;
    }

    onResolve(trimmed || null);
  }, [value, validate, required, onResolve]);

  const cancel = useCallback(() => onResolve(null), [onResolve]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        cancel();
      }
    },
    [submit, cancel],
  );

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (e.target === overlayRef.current) cancel();
    },
    [cancel],
  );

  const handleInput = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    setValue(target.value);
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay active"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="modal prompt-dialog-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body">
          <p className="prompt-dialog-message">{message}</p>
          <input
            ref={inputRef}
            type={inputType}
            className={`prompt-dialog-input${error ? ' input-error' : ''}`}
            value={value}
            placeholder={placeholder}
            onInput={handleInput}
          />
          {error && <p className="prompt-dialog-validation">{error}</p>}
        </div>
        <div className="modal-actions prompt-dialog-actions">
          <button className="btn-secondary prompt-dialog-cancel" type="button" onClick={cancel}>
            {cancelText}
          </button>
          <button className="btn-primary prompt-dialog-confirm" type="button" onClick={submit}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
