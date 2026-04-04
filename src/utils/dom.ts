/**
 * DOM utility functions — XSS-safe HTML escaping.
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
