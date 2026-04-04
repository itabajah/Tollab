/**
 * String utility functions — truncation and unique ID generation.
 */

/**
 * Truncates a string to `maxLength` characters, appending an ellipsis (`…`)
 * if the string exceeds the limit.
 *
 * Returns the original value when it is falsy or already within bounds.
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + '\u2026';
}

/**
 * Generates a unique identifier by combining the current timestamp with a
 * random base-36 suffix.
 */
export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}
