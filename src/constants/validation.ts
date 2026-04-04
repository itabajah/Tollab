/**
 * Validation limits and regex patterns for input validation.
 */

/** Maximum lengths and numeric bounds for validated inputs. */
export const VALIDATION_LIMITS = Object.freeze({
  /** Maximum course name length. */
  COURSE_NAME_MAX: 100,
  /** Maximum homework title length. */
  HOMEWORK_TITLE_MAX: 200,
  /** Maximum notes/description length. */
  NOTES_MAX: 5000,
  /** Maximum URL length. */
  URL_MAX: 2048,
  /** Maximum profile name length. */
  PROFILE_NAME_MAX: 50,
  /** Maximum semester name length. */
  SEMESTER_NAME_MAX: 50,
  /** Minimum year for semester creation. */
  MIN_YEAR: 2000,
  /** Maximum year for semester creation. */
  MAX_YEAR: 2100,
} as const);

/** Regex patterns for input format validation. */
export const VALIDATION_PATTERNS = Object.freeze({
  /** Valid URL (http or https). */
  URL: /^https?:\/\/[^\s<>'"]+$/i,
  /** YouTube URL detection. */
  YOUTUBE_URL: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i,
  /** Panopto URL detection. */
  PANOPTO_URL: /panopto/i,
  /** Course number (alphanumeric, hyphens, dots, underscores, max 20). */
  COURSE_NUMBER: /^[A-Za-z0-9\-_.]{0,20}$/,
  /** Time format HH:MM. */
  TIME_FORMAT: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  /** Date format YYYY-MM-DD. */
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
  /** Safe filename characters. */
  SAFE_FILENAME: /^[a-zA-Z0-9_\-. ]+$/,
  /** Standard UUID format. */
  UUID: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
} as const);

/** HTML entity mapping for XSS-safe escaping. */
export const HTML_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
});
