/**
 * Input validation utilities for the Tollab academic management app.
 * All validators return ValidationResult<T> for type-safe validation chains.
 *
 * Migrated from js/validation.js — preserves all error messages and regex logic.
 */

import type { DateValidationResult, ValidationResult, VideoUrlResult } from '@/types';
import { VALIDATION_LIMITS, VALIDATION_PATTERNS } from '@/constants/validation';

// ============================================================================
// OPTION TYPES
// ============================================================================

/** Options for string validation. */
export interface StringValidationOptions {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  trim?: boolean;
  allowEmpty?: boolean;
}

/** Options for number validation. */
export interface NumberValidationOptions {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  allowZero?: boolean;
}

/** Options for URL validation. */
export interface UrlValidationOptions {
  required?: boolean;
  allowedProtocols?: string[];
  maxLength?: number;
}

/** Options for date validation. */
export interface DateValidationOptions {
  required?: boolean;
  minDate?: string | null;
  maxDate?: string | null;
  allowPast?: boolean;
  allowFuture?: boolean;
}

/** Options for time validation. */
export interface TimeValidationOptions {
  required?: boolean;
}

// ============================================================================
// IMPORTED DATA TYPES
// ============================================================================

/** Shape of a semester in imported data. */
export interface ImportedSemester {
  id?: string;
  name?: string;
  courses?: unknown[];
  [key: string]: unknown;
}

/** Shape of valid imported data after structural validation. */
export interface ImportedData {
  semesters: ImportedSemester[];
  settings?: Record<string, unknown>;
}

/** Extended validation result for imported data, includes non-fatal warnings. */
export interface ImportedDataResult extends ValidationResult<ImportedData | null> {
  warnings: string[];
}

// ============================================================================
// STRING VALIDATION
// ============================================================================

/** Validates and sanitizes a string input. */
export function validateString(
  value: unknown,
  options: StringValidationOptions = {},
): ValidationResult<string> {
  const {
    required = false,
    maxLength = 1000,
    minLength = 0,
    trim = true,
    allowEmpty = !required,
    pattern,
    patternMessage = 'Invalid format',
  } = options;

  let str = value == null ? '' : String(value);
  if (trim) str = str.trim();

  if (required && !str) {
    return { valid: false, value: str, error: 'This field is required' };
  }

  if (!allowEmpty && !str) {
    return { valid: false, value: str, error: 'This field cannot be empty' };
  }

  if (!str && allowEmpty) {
    return { valid: true, value: str, error: null };
  }

  if (str.length < minLength) {
    return { valid: false, value: str, error: `Must be at least ${minLength} characters` };
  }

  if (str.length > maxLength) {
    return { valid: false, value: str, error: `Must be no more than ${maxLength} characters` };
  }

  if (pattern && !pattern.test(str)) {
    return { valid: false, value: str, error: patternMessage };
  }

  return { valid: true, value: str, error: null };
}

/** Validates a course name. */
export function validateCourseName(name: unknown): ValidationResult<string> {
  return validateString(name, {
    required: true,
    maxLength: VALIDATION_LIMITS.COURSE_NAME_MAX,
    minLength: 1,
  });
}

/** Validates a homework title. */
export function validateHomeworkTitle(title: unknown): ValidationResult<string> {
  return validateString(title, {
    required: true,
    maxLength: VALIDATION_LIMITS.HOMEWORK_TITLE_MAX,
    minLength: 1,
  });
}

/** Validates a profile name (format only; uniqueness belongs in the store layer). */
export function validateProfileName(name: unknown): ValidationResult<string> {
  return validateString(name, {
    required: true,
    maxLength: VALIDATION_LIMITS.PROFILE_NAME_MAX,
    minLength: 1,
  });
}

/** Validates notes or description text. */
export function validateNotes(notes: unknown): ValidationResult<string> {
  return validateString(notes, {
    required: false,
    maxLength: VALIDATION_LIMITS.NOTES_MAX,
    allowEmpty: true,
  });
}

// ============================================================================
// URL VALIDATION
// ============================================================================

/** Validates a URL (http/https only). */
export function validateUrl(
  url: unknown,
  options: UrlValidationOptions = {},
): ValidationResult<string> {
  const {
    required = false,
    allowedProtocols = ['http:', 'https:'],
    maxLength = VALIDATION_LIMITS.URL_MAX,
  } = options;

  const str = url == null ? '' : String(url).trim();

  if (required && !str) {
    return { valid: false, value: str, error: 'URL is required' };
  }

  if (!str) {
    return { valid: true, value: str, error: null };
  }

  if (str.length > maxLength) {
    return { valid: false, value: str, error: 'URL is too long' };
  }

  try {
    const parsed = new URL(str);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, value: str, error: `URL must use ${allowedProtocols.join(' or ')}` };
    }
    return { valid: true, value: str, error: null };
  } catch {
    return { valid: false, value: str, error: 'Invalid URL format' };
  }
}

/** Validates a video URL with platform detection (YouTube, Panopto, or other). */
export function validateVideoUrl(url: unknown): VideoUrlResult {
  const baseResult = validateUrl(url, { required: false });

  if (!baseResult.valid || !baseResult.value) {
    return { ...baseResult, platform: 'unknown' };
  }

  if (VALIDATION_PATTERNS.YOUTUBE_URL.test(baseResult.value)) {
    return { ...baseResult, platform: 'youtube' };
  }

  if (VALIDATION_PATTERNS.PANOPTO_URL.test(baseResult.value)) {
    return { ...baseResult, platform: 'panopto' };
  }

  return { ...baseResult, platform: 'other' };
}

// ============================================================================
// NUMBER VALIDATION
// ============================================================================

/** Validates a number input. */
export function validateNumber(
  value: unknown,
  options: NumberValidationOptions = {},
): ValidationResult<number | null> {
  const {
    required = false,
    min = -Infinity,
    max = Infinity,
    integer = false,
    allowZero = true,
  } = options;

  if (value === '' || value == null) {
    if (required) {
      return { valid: false, value: null, error: 'This field is required' };
    }
    return { valid: true, value: null, error: null };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, value: null, error: 'Must be a valid number' };
  }

  if (integer && !Number.isInteger(num)) {
    return { valid: false, value: null, error: 'Must be a whole number' };
  }

  if (!allowZero && num === 0) {
    return { valid: false, value: null, error: 'Cannot be zero' };
  }

  if (num < min) {
    return { valid: false, value: null, error: `Must be at least ${min}` };
  }

  if (num > max) {
    return { valid: false, value: null, error: `Must be no more than ${max}` };
  }

  return { valid: true, value: num, error: null };
}

/** Validates course points. */
export function validateCoursePoints(points: unknown): ValidationResult<number | null> {
  return validateNumber(points, {
    required: false,
    min: 0,
    max: 100,
  });
}

/** Validates a grade percentage. */
export function validateGrade(grade: unknown): ValidationResult<number | null> {
  return validateNumber(grade, {
    required: false,
    min: 0,
    max: 100,
    integer: true,
  });
}

/** Validates a calendar hour. */
export function validateCalendarHour(hour: unknown): ValidationResult<number | null> {
  return validateNumber(hour, {
    required: true,
    min: 0,
    max: 23,
    integer: true,
  });
}

// ============================================================================
// DATE/TIME VALIDATION
// ============================================================================

/** Validates a date string (YYYY-MM-DD format). */
export function validateDate(
  value: unknown,
  options: DateValidationOptions = {},
): DateValidationResult {
  const {
    required = false,
    minDate = null,
    maxDate = null,
    allowPast = true,
    allowFuture = true,
  } = options;

  const str = value == null ? '' : String(value).trim();

  if (required && !str) {
    return { valid: false, value: str, date: null, error: 'Date is required' };
  }

  if (!str) {
    return { valid: true, value: str, date: null, error: null };
  }

  if (!VALIDATION_PATTERNS.DATE_FORMAT.test(str)) {
    return { valid: false, value: str, date: null, error: 'Invalid date format (use YYYY-MM-DD)' };
  }

  const date = new Date(str + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return { valid: false, value: str, date: null, error: 'Invalid date' };
  }

  // Verify parsed date matches input (catches roll-over, e.g. Feb 29 on non-leap years)
  const parts = str.split('-');
  if (
    date.getFullYear() !== Number(parts[0]) ||
    date.getMonth() + 1 !== Number(parts[1]) ||
    date.getDate() !== Number(parts[2])
  ) {
    return { valid: false, value: str, date: null, error: 'Invalid date' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!allowPast && date < today) {
    return { valid: false, value: str, date: null, error: 'Date cannot be in the past' };
  }

  if (!allowFuture && date > today) {
    return { valid: false, value: str, date: null, error: 'Date cannot be in the future' };
  }

  if (minDate && date < new Date(minDate)) {
    return { valid: false, value: str, date: null, error: `Date must be on or after ${minDate}` };
  }

  if (maxDate && date > new Date(maxDate)) {
    return { valid: false, value: str, date: null, error: `Date must be on or before ${maxDate}` };
  }

  return { valid: true, value: str, date, error: null };
}

/** Validates a time string (HH:MM format). */
export function validateTime(
  value: unknown,
  options: TimeValidationOptions = {},
): ValidationResult<string> {
  const { required = false } = options;

  const str = value == null ? '' : String(value).trim();

  if (required && !str) {
    return { valid: false, value: str, error: 'Time is required' };
  }

  if (!str) {
    return { valid: true, value: str, error: null };
  }

  if (!VALIDATION_PATTERNS.TIME_FORMAT.test(str)) {
    return { valid: false, value: str, error: 'Invalid time format (use HH:MM)' };
  }

  return { valid: true, value: str, error: null };
}

// ============================================================================
// DATA STRUCTURE VALIDATION
// ============================================================================

/** Validates imported JSON data structure. */
export function validateImportedData(data: unknown): ImportedDataResult {
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, value: null, error: 'Invalid data format: expected an object', warnings };
  }

  const record = data as Record<string, unknown>;

  if (!Array.isArray(record.semesters)) {
    // Check for wrapped export format { data: { semesters: [...] } }
    if (
      record.data &&
      typeof record.data === 'object' &&
      Array.isArray((record.data as Record<string, unknown>).semesters)
    ) {
      return validateImportedData(record.data);
    }
    return { valid: false, value: null, error: 'Invalid data format: missing semesters array', warnings };
  }

  const semesters = record.semesters as unknown[];

  for (let i = 0; i < semesters.length; i++) {
    const sem = semesters[i];
    if (!sem || typeof sem !== 'object') {
      return { valid: false, value: null, error: `Invalid semester at index ${i}`, warnings };
    }

    const semRecord = sem as Record<string, unknown>;

    if (!semRecord.id || !semRecord.name) {
      warnings.push(`Semester at index ${i} has missing id or name - will be auto-generated`);
    }

    if (semRecord.courses && !Array.isArray(semRecord.courses)) {
      return {
        valid: false,
        value: null,
        error: `Semester "${String(semRecord.name ?? i)}" has invalid courses format`,
        warnings,
      };
    }
  }

  if (record.settings && typeof record.settings !== 'object') {
    warnings.push('Settings format is invalid - will use defaults');
  }

  const validData: ImportedData = {
    semesters: semesters as ImportedSemester[],
    settings:
      typeof record.settings === 'object' && record.settings !== null
        ? (record.settings as Record<string, unknown>)
        : undefined,
  };

  return { valid: true, value: validData, error: null, warnings };
}

/** Validates a schedule item (day + start/end times). */
export function validateScheduleItem(
  item: unknown,
): ValidationResult<{ day: number; start: string; end: string }> {
  const defaultValue = { day: 0, start: '', end: '' };

  if (!item || typeof item !== 'object') {
    return { valid: false, value: defaultValue, error: 'Invalid schedule item' };
  }

  const record = item as Record<string, unknown>;

  const dayResult = validateNumber(record.day, {
    required: true,
    min: 0,
    max: 6,
    integer: true,
  });
  if (!dayResult.valid) {
    return { valid: false, value: defaultValue, error: 'Invalid day: ' + (dayResult.error ?? '') };
  }

  const startResult = validateTime(record.start, { required: true });
  if (!startResult.valid) {
    return { valid: false, value: defaultValue, error: 'Invalid start time: ' + (startResult.error ?? '') };
  }

  const endResult = validateTime(record.end, { required: true });
  if (!endResult.valid) {
    return { valid: false, value: defaultValue, error: 'Invalid end time: ' + (endResult.error ?? '') };
  }

  // Verify end is after start
  const startParts = startResult.value.split(':');
  const endParts = endResult.value.split(':');
  const startMinutes = Number(startParts[0] ?? 0) * 60 + Number(startParts[1] ?? 0);
  const endMinutes = Number(endParts[0] ?? 0) * 60 + Number(endParts[1] ?? 0);

  if (endMinutes <= startMinutes) {
    return { valid: false, value: defaultValue, error: 'End time must be after start time' };
  }

  return {
    valid: true,
    value: { day: dayResult.value ?? 0, start: startResult.value, end: endResult.value },
    error: null,
  };
}

// ============================================================================
// SANITIZATION
// ============================================================================

/** Sanitizes a string for safe display (removes control characters, normalizes whitespace). */
export function sanitizeString(str: unknown): string {
  if (str == null) return '';

  return String(str)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Sanitizes a filename for safe download. */
export function sanitizeFilename(filename: unknown): string {
  if (!filename) return 'export';

  return (
    String(filename)
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100) || 'export'
  );
}
