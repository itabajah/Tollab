/**
 * Error handling utilities — error code extraction, user-friendly messaging,
 * exponential backoff with jitter, and retry wrapper.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Retry / backoff defaults. */
const ERROR_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10_000,
  BACKOFF_MULTIPLIER: 2,
  NON_RETRYABLE_ERRORS: [
    'PERMISSION_DENIED',
    'UNAUTHENTICATED',
    'INVALID_ARGUMENT',
    'NOT_FOUND',
    'ALREADY_EXISTS',
  ] as readonly string[],
} as const;

/** User-friendly messages keyed by error code. */
const ERROR_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  OFFLINE:
    'You appear to be offline. Changes will sync when you reconnect.',
  PERMISSION_DENIED:
    "You don't have permission to perform this action.",
  UNAUTHENTICATED: 'Please sign in to continue.',
  QUOTA_EXCEEDED:
    'Storage quota exceeded. Please delete some data.',
  UNAVAILABLE:
    'Service temporarily unavailable. Please try again later.',
  INVALID_DATA: 'The data format is invalid.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  CORRUPT_DATA:
    'Data appears to be corrupted. Try refreshing the page.',
  QUOTA_EXCEEDED_ERROR:
    'Local storage is full. Please export your data and clear old profiles.',
  STORAGE_ERROR:
    'Failed to save data. Your browser storage may be full or blocked.',
  UNKNOWN: 'Something went wrong. Please try again.',
});

// ---------------------------------------------------------------------------
// Retry options
// ---------------------------------------------------------------------------

/** Options for {@link withRetry}. */
export interface RetryOptions {
  /** Maximum number of retries (default: 3). */
  maxRetries?: number;
  /** Called before each retry with attempt metadata. */
  onRetry?: (info: RetryInfo) => void;
  /** Predicate — return `true` to retry the error (default: {@link isRetryableError}). */
  shouldRetry?: (error: unknown) => boolean;
  /** Contextual label for logging (default: `"Operation"`). */
  context?: string;
}

/** Metadata passed to `onRetry` callbacks. */
export interface RetryInfo {
  attempt: number;
  maxRetries: number;
  delay: number;
  error: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ErrorLike {
  code?: string;
  name?: string;
  message?: string;
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalises an error into a standard upper-case error code string.
 *
 * Handles Firebase errors, DOMExceptions, network/fetch errors, and
 * falls back to message-sniffing before returning `"UNKNOWN"`.
 */
export function extractErrorCode(error: unknown): string {
  if (!error) return 'UNKNOWN';

  if (isErrorLike(error)) {
    if (error.code) return error.code.replace('/', '_').toUpperCase();
    if (error.name === 'QuotaExceededError') return 'QUOTA_EXCEEDED_ERROR';
    if (error.name === 'SecurityError') return 'STORAGE_ERROR';
    if (error.name === 'TypeError' && error.message?.includes('fetch'))
      return 'NETWORK_ERROR';
    if (error.name === 'AbortError') return 'TIMEOUT';

    const msg = (error.message ?? '').toLowerCase();
    if (msg.includes('network') || msg.includes('fetch')) return 'NETWORK_ERROR';
    if (msg.includes('timeout')) return 'TIMEOUT';
    if (msg.includes('offline')) return 'OFFLINE';
    if (msg.includes('permission')) return 'PERMISSION_DENIED';
  }

  return 'UNKNOWN';
}

/**
 * Maps an error code to a plain-English message suitable for display.
 */
export function getUserFriendlyError(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES['UNKNOWN']!;
}

/**
 * Returns `true` when the error is transient and the operation should be
 * retried (i.e. not a permission / auth / argument error).
 */
export function isRetryableError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return !(ERROR_CONFIG.NON_RETRYABLE_ERRORS as readonly string[]).includes(
    code,
  );
}

/**
 * Calculates an exponential back-off delay (in ms) with ±20 % jitter.
 *
 * @param attempt   Zero-based attempt index.
 * @param baseDelay Override for the initial delay (default: 1 000 ms).
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = ERROR_CONFIG.INITIAL_DELAY,
): number {
  const base =
    baseDelay * Math.pow(ERROR_CONFIG.BACKOFF_MULTIPLIER, attempt);
  const capped = Math.min(base, ERROR_CONFIG.MAX_DELAY);
  const jitter = capped * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(capped + jitter);
}

/**
 * Executes an async function with automatic retry on transient failures.
 *
 * The wrapped function receives the current attempt index (0-based) as its
 * argument so callers can adapt behaviour per attempt.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = ERROR_CONFIG.MAX_RETRIES,
    onRetry = null,
    shouldRetry = isRetryableError,
    context = 'Operation',
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error: unknown) {
      lastError = error;

      if (attempt >= maxRetries || !shouldRetry(error)) {
        break;
      }

      const delay = calculateBackoffDelay(attempt);

      if (onRetry) {
        onRetry({ attempt: attempt + 1, maxRetries, delay, error });
      }

      // eslint-disable-next-line no-console
      console.warn(
        `[${context}] Attempt ${String(attempt + 1)} failed, retrying in ${String(delay)}ms...`,
        error,
      );

      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Executes a synchronous function, returning `fallback` when it throws.
 */
export function safeExecute<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
