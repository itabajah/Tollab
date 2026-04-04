import { describe, it, expect, vi } from 'vitest';
import {
  extractErrorCode,
  isRetryableError,
  calculateBackoffDelay,
  withRetry,
  safeExecute,
} from '@/utils/error-handling';

describe('extractErrorCode', () => {
  it('returns UNKNOWN for null', () => {
    expect(extractErrorCode(null)).toBe('UNKNOWN');
  });

  it('returns UNKNOWN for undefined', () => {
    expect(extractErrorCode(undefined)).toBe('UNKNOWN');
  });

  it('extracts uppercased code from error with code property', () => {
    const err = Object.assign(new Error('fail'), { code: 'auth/invalid-email' });
    expect(extractErrorCode(err)).toBe('AUTH_INVALID-EMAIL');
  });

  it('handles Firebase-style slash codes (replaces / with _)', () => {
    const err = { code: 'storage/unauthorized', message: 'Not allowed' };
    expect(extractErrorCode(err)).toBe('STORAGE_UNAUTHORIZED');
  });

  it('detects QuotaExceededError by name', () => {
    const err = { name: 'QuotaExceededError', message: 'quota' };
    expect(extractErrorCode(err)).toBe('QUOTA_EXCEEDED_ERROR');
  });

  it('detects SecurityError by name', () => {
    const err = { name: 'SecurityError', message: 'blocked' };
    expect(extractErrorCode(err)).toBe('STORAGE_ERROR');
  });

  it('detects network error from message', () => {
    const err = new Error('network failure');
    expect(extractErrorCode(err)).toBe('NETWORK_ERROR');
  });

  it('detects timeout from message', () => {
    const err = new Error('request timeout');
    expect(extractErrorCode(err)).toBe('TIMEOUT');
  });

  it('detects permission from message', () => {
    const err = new Error('permission denied');
    expect(extractErrorCode(err)).toBe('PERMISSION_DENIED');
  });

  it('returns UNKNOWN for plain Error with no signal', () => {
    expect(extractErrorCode(new Error('something'))).toBe('UNKNOWN');
  });
});

describe('isRetryableError', () => {
  it('returns true for a generic network error (retryable)', () => {
    const err = new Error('network failure');
    expect(isRetryableError(err)).toBe(true);
  });

  it('returns false for PERMISSION_DENIED (non-retryable)', () => {
    const err = { code: 'PERMISSION_DENIED' };
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns false for NOT_FOUND (non-retryable)', () => {
    const err = { code: 'NOT_FOUND' };
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns false for UNAUTHENTICATED (non-retryable)', () => {
    const err = { code: 'UNAUTHENTICATED' };
    expect(isRetryableError(err)).toBe(false);
  });

  it('returns true for unknown errors (default retryable)', () => {
    expect(isRetryableError(new Error('random glitch'))).toBe(true);
  });
});

describe('calculateBackoffDelay', () => {
  it('returns roughly base delay for attempt 0', () => {
    const delay = calculateBackoffDelay(0, 1000);
    // base = 1000, jitter ±20% → 800..1200
    expect(delay).toBeGreaterThanOrEqual(800);
    expect(delay).toBeLessThanOrEqual(1200);
  });

  it('increases with attempt number', () => {
    // attempt 0 → base 1000, attempt 1 → base 2000, attempt 2 → base 4000
    const d0 = calculateBackoffDelay(0, 1000);
    const d2 = calculateBackoffDelay(2, 1000);
    expect(d2).toBeGreaterThan(d0);
  });

  it('caps at MAX_DELAY (10 000 ms)', () => {
    const delay = calculateBackoffDelay(20, 1000);
    // MAX_DELAY is 10_000, +20% jitter → max 12_000
    expect(delay).toBeLessThanOrEqual(12_000);
  });

  it('never returns a negative value', () => {
    for (let i = 0; i < 10; i++) {
      expect(calculateBackoffDelay(i, 100)).toBeGreaterThan(0);
    }
  });
});

describe('withRetry', () => {
  it('resolves on first attempt if function succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on Nth attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network failure'))
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after max retries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network failure'));

    await expect(
      withRetry(fn, { maxRetries: 2 }),
    ).rejects.toThrow('network failure');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ code: 'PERMISSION_DENIED' });

    await expect(withRetry(fn, { maxRetries: 3 })).rejects.toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('safeExecute', () => {
  it('returns the value for a non-throwing function', () => {
    const result = safeExecute(() => 42, -1);
    expect(result).toBe(42);
  });

  it('returns fallback for a throwing function', () => {
    const result = safeExecute(() => {
      throw new Error('boom');
    }, -1);
    expect(result).toBe(-1);
  });

  it('does not swallow falsy return values', () => {
    expect(safeExecute(() => 0, -1)).toBe(0);
    expect(safeExecute(() => '', 'fallback')).toBe('');
    expect(safeExecute(() => false, true)).toBe(false);
  });

  it('returns fallback when function throws', () => {
    const result = safeExecute<string | null>(() => {
      throw new Error('boom');
    }, null);
    expect(result).toBeNull();
  });
});
