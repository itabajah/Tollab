/**
 * Tests for cors-proxy.ts — CORS proxy with retry and fallback.
 *
 * Global fetch is mocked. Tests cover successful proxy attempts, retry logic,
 * rate limiting, network errors, protocol validation, and error aggregation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock CORS_PROXIES constant
// ---------------------------------------------------------------------------

vi.mock('@/constants/api', () => ({
  CORS_PROXIES: [
    (url: string) => `https://proxy1.test/proxy?url=${encodeURIComponent(url)}`,
    (url: string) => `https://proxy2.test/proxy?url=${encodeURIComponent(url)}`,
  ],
}));

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------

import {
  fetchViaProxy,
  ProxyFetchError,
  type FetchConfig,
} from '@/services/cors-proxy';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cors-proxy', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  function mockFetchResponse(
    status: number,
    text: string,
    ok?: boolean,
  ): Response {
    return {
      ok: ok ?? (status >= 200 && status < 300),
      status,
      text: () => Promise.resolve(text),
      headers: new Headers(),
    } as Response;
  }

  // =========================================================================
  // Protocol validation
  // =========================================================================

  describe('protocol validation', () => {
    it('rejects ftp:// URLs', async () => {
      await expect(fetchViaProxy('ftp://evil.com/file')).rejects.toThrow(
        ProxyFetchError,
      );
      await expect(fetchViaProxy('ftp://evil.com/file')).rejects.toThrow(
        'disallowed protocol',
      );
    });

    it('rejects javascript: URLs', async () => {
      // eslint-disable-next-line no-script-url
      await expect(fetchViaProxy('javascript:alert(1)')).rejects.toThrow(
        ProxyFetchError,
      );
    });

    it('rejects invalid URLs', async () => {
      await expect(fetchViaProxy('not a url at all')).rejects.toThrow(
        ProxyFetchError,
      );
      await expect(fetchViaProxy('not a url at all')).rejects.toThrow(
        'Invalid target URL',
      );
    });

    it('accepts https:// URLs', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockFetchResponse(200, 'ok'),
      );

      const result = await fetchViaProxy('https://example.com');
      expect(result.text).toBe('ok');
    });

    it('accepts http:// URLs', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockFetchResponse(200, 'ok'),
      );

      const result = await fetchViaProxy('http://example.com');
      expect(result.text).toBe('ok');
    });
  });

  // =========================================================================
  // Successful requests
  // =========================================================================

  describe('successful proxy requests', () => {
    it('returns text and status on first proxy success', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockFetchResponse(200, '<html>content</html>'),
      );

      const result = await fetchViaProxy('https://example.com');

      expect(result.text).toBe('<html>content</html>');
      expect(result.status).toBe(200);
      expect(result.proxyIndex).toBe(1);
    });

    it('falls back to second proxy when first fails', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      // First proxy: 500 twice (max retries = 2)
      fetchMock.mockResolvedValueOnce(mockFetchResponse(500, 'error'));
      fetchMock.mockResolvedValueOnce(mockFetchResponse(500, 'error'));
      // Second proxy: success
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, 'success'));

      const result = await fetchViaProxy('https://example.com');

      expect(result.text).toBe('success');
      expect(result.proxyIndex).toBe(2);
    });

    it('reports 1-based proxyIndex', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockFetchResponse(200, 'ok'),
      );

      const result = await fetchViaProxy('https://example.com');
      expect(result.proxyIndex).toBe(1);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('throws ProxyFetchError when all proxies fail', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      // Both proxies return 500, 2 retries each → 4 calls
      fetchMock.mockResolvedValue(mockFetchResponse(500, 'error'));

      await expect(
        fetchViaProxy('https://example.com'),
      ).rejects.toBeInstanceOf(ProxyFetchError);
    });

    it('includes error details for each attempt', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValue(mockFetchResponse(500, 'error'));

      try {
        await fetchViaProxy('https://example.com');
        expect.fail('Should have thrown');
      } catch (e) {
        const err = e as ProxyFetchError;
        expect(err.details.length).toBeGreaterThan(0);
        expect(err.details[0]).toMatch(/Proxy 1/);
      }
    });

    it('skips to next proxy on network error', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      // First proxy: network error
      fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
      // Second proxy: success
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, 'success'));

      const result = await fetchViaProxy('https://example.com');
      expect(result.text).toBe('success');
      expect(result.proxyIndex).toBe(2);
    });

    it('skips retry on 4xx client errors (except 429)', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      // First proxy: 404
      fetchMock.mockResolvedValueOnce(mockFetchResponse(404, 'not found'));
      // Second proxy: success
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, 'found'));

      const result = await fetchViaProxy('https://example.com');
      expect(result.proxyIndex).toBe(2);
      // Should only have called fetch twice (no retry on 404)
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries on 429 rate limit', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      // First attempt: 429
      fetchMock.mockResolvedValueOnce(mockFetchResponse(429, 'rate limited'));
      // Second attempt: success
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, 'ok'));

      const result = await fetchViaProxy('https://example.com');
      expect(result.text).toBe('ok');
      expect(result.proxyIndex).toBe(1);
    });

    it('retries on 5xx server errors', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      // First attempt: 502
      fetchMock.mockResolvedValueOnce(mockFetchResponse(502, 'bad gateway'));
      // Second attempt: success
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, 'ok'));

      const result = await fetchViaProxy('https://example.com');
      expect(result.text).toBe('ok');
    });

    it('handles timeout as error', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      const abortError = new Error('Request timed out');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);

      await expect(
        fetchViaProxy('https://example.com', { timeout: 100 }),
      ).rejects.toBeInstanceOf(ProxyFetchError);
    });
  });

  // =========================================================================
  // Config
  // =========================================================================

  describe('configuration', () => {
    it('respects maxRetriesPerProxy = 1', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValue(mockFetchResponse(500, 'error'));

      const config: FetchConfig = { maxRetriesPerProxy: 1 };
      await expect(
        fetchViaProxy('https://example.com', config),
      ).rejects.toBeInstanceOf(ProxyFetchError);

      // 1 attempt per proxy × 2 proxies = 2 total
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('calls onProgress callback', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, 'ok'));

      const onProgress = vi.fn();
      await fetchViaProxy('https://example.com', { onProgress });

      expect(onProgress).toHaveBeenCalledWith(1, 2, 'trying');
    });

    it('calls onProgress with retrying status', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(mockFetchResponse(500, 'error'));
      fetchMock.mockResolvedValueOnce(mockFetchResponse(200, 'ok'));

      const onProgress = vi.fn();
      await fetchViaProxy('https://example.com', { onProgress });

      const calls = onProgress.mock.calls;
      expect(calls[0]).toEqual([1, 2, 'trying']);
      expect(calls[1]).toEqual([1, 2, 'retrying']);
    });
  });

  // =========================================================================
  // ProxyFetchError class
  // =========================================================================

  describe('ProxyFetchError', () => {
    it('has correct name and frozen details', () => {
      const err = new ProxyFetchError('test', ['detail1', 'detail2']);
      expect(err.name).toBe('ProxyFetchError');
      expect(err.message).toBe('test');
      expect(err.details).toEqual(['detail1', 'detail2']);
      expect(Object.isFrozen(err.details)).toBe(true);
    });

    it('is an instance of Error', () => {
      const err = new ProxyFetchError('test', []);
      expect(err).toBeInstanceOf(Error);
    });
  });
});
