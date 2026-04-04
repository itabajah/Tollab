/**
 * Validation result types for the Tollab academic management app.
 */

/** Generic validation result returned by all validators. */
export interface ValidationResult<T = string> {
  /** Whether the input passed validation. */
  valid: boolean;
  /** The coerced/sanitized value (may differ from raw input). */
  value: T;
  /** Human-readable error message, or null if valid. */
  error: string | null;
}

/** Extended validation result for date fields. */
export interface DateValidationResult extends ValidationResult<string> {
  /** Parsed Date object, or null if invalid/empty. */
  date: Date | null;
}

/** Result of video URL validation with platform detection. */
export interface VideoUrlResult extends ValidationResult<string> {
  /** Detected video platform. */
  platform: 'youtube' | 'panopto' | 'other' | 'unknown';
}

/** Result of imported data structure validation. */
export interface ImportValidationResult {
  /** Whether the imported data is structurally valid. */
  valid: boolean;
  /** Fatal error message, or null if valid. */
  error: string | null;
  /** Non-fatal warnings about the imported data. */
  warnings: string[];
}
