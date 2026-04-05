/**
 * DOM utility functions — XSS-safe HTML escaping, typed event helpers,
 * and keyboard activation handlers.
 */

import { HTML_ENTITIES } from '@/constants';

/**
 * Escapes HTML special characters to prevent XSS.
 * Converts `&`, `<`, `>`, `"`, `'` to their HTML entity equivalents.
 */
export function escapeHtml(text: string): string {
  if (text == null) return '';
  return String(text).replace(
    /[&<>"']/g,
    (char) => HTML_ENTITIES[char] ?? char,
  );
}

// ---------------------------------------------------------------------------
// Typed event helpers (#99)
// ---------------------------------------------------------------------------

/** Extract `.value` from an `<input>` event target. */
export function getInputValue(e: Event): string {
  return (e.target as HTMLInputElement).value;
}

/** Extract `.value` from a `<select>` event target. */
export function getSelectValue(e: Event): string {
  return (e.target as HTMLSelectElement).value;
}

/** Extract `.value` from a `<textarea>` event target. */
export function getTextAreaValue(e: Event): string {
  return (e.target as HTMLTextAreaElement).value;
}

/** Extract `.checked` from an `<input type="checkbox">` event target. */
export function getInputChecked(e: Event): boolean {
  return (e.target as HTMLInputElement).checked;
}

// ---------------------------------------------------------------------------
// Keyboard activation helper (#98)
// ---------------------------------------------------------------------------

/**
 * Returns an `onKeyDown` handler that calls `callback` on Enter or Space,
 * matching WAI-ARIA button activation pattern.
 */
export function handleKeyActivate(callback: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}
