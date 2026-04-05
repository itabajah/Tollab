/**
 * CORS proxy with retry and fallback — fetches external resources through
 * multiple proxy services with exponential backoff.
 */

import { CORS_PROXIES } from '@/constants/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for proxy fetch behaviour. */
export interface FetchConfig {
  /** Maximum retry attempts per proxy (default: 2). */
  maxRetriesPerProxy?: number;
  /** Timeout per fetch attempt in ms (default: 15 000). */
  timeout?: number;
  /** Progress callback: `(proxyIndex, totalProxies, status)`. */
  onProgress?: (
    proxyIndex: number,
    totalProxies: number,
    status: 'trying' | 'retrying',
  ) => void;
}

/** Successful proxy fetch result. */
export interface ProxyResult {
  /** Response body as text. */
  text: string;
  /** HTTP status code of the successful response. */
  status: number;
  /** Index (1-based) of the proxy that succeeded. */
  proxyIndex: number;
}

/** Error thrown when all proxies and retries are exhausted. */
export class ProxyFetchError extends Error {
  /** Individual error messages from each proxy/attempt. */
  readonly details: readonly string[];

  constructor(message: string, details: string[]) {
    super(message);
    this.name = 'ProxyFetchError';
    this.details = Object.freeze(details);
  }
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES_PER_PROXY = 2;
const DEFAULT_FETCH_TIMEOUT = 15_000;
const INITIAL_RETRY_DELAY = 500;
const MAX_RETRY_DELAY = 5_000;
const BACKOFF_MULTIPLIER = 2;
const RATE_LIMIT_BASE_DELAY = 2_000;
const JITTER_FACTOR = 0.2;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createTimeoutController(timeout: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return { controller, timeoutId };
}

function waitWithBackoff(
  attempt: number,
  baseDelay: number = INITIAL_RETRY_DELAY,
  maxDelay: number = MAX_RETRY_DELAY,
): Promise<void> {
  const delay = Math.min(
    baseDelay * Math.pow(BACKOFF_MULTIPLIER, attempt),
    maxDelay,
  );
  // Add jitter to prevent thundering herd
  const jitter = delay * JITTER_FACTOR * Math.random();
  return new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

async function fetchWithTimeout(
  url: string,
  timeout: number,
): Promise<Response> {
  const { controller, timeoutId } = createTimeoutController(timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches a URL through the configured CORS proxies with fallback and retry.
 *
 * Each proxy is tried up to `maxRetriesPerProxy` times with exponential
 * backoff. On rate-limit (429) the delay is longer. Network errors skip
 * immediately to the next proxy. Client 4xx errors (except 429) skip the
 * proxy entirely.
 *
 * @throws {ProxyFetchError} when every proxy and retry is exhausted.
 */
export async function fetchViaProxy(
  url: string,
  config?: FetchConfig,
): Promise<ProxyResult> {
  // Validate target URL protocol
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new ProxyFetchError(
        `Refused to proxy URL with disallowed protocol: ${parsed.protocol}`,
        [`Invalid protocol: ${parsed.protocol}`],
      );
    }
  } catch (e) {
    if (e instanceof ProxyFetchError) throw e;
    throw new ProxyFetchError('Invalid target URL', ['Could not parse URL']);
  }

  const {
    maxRetriesPerProxy = DEFAULT_MAX_RETRIES_PER_PROXY,
    timeout = DEFAULT_FETCH_TIMEOUT,
    onProgress,
  } = config ?? {};

  const errors: string[] = [];
  const totalProxies = CORS_PROXIES.length;

  for (let proxyIndex = 0; proxyIndex < totalProxies; proxyIndex++) {
    const makeProxyUrl = CORS_PROXIES[proxyIndex]!;
    const proxyUrl = makeProxyUrl(url);

    for (let retry = 0; retry < maxRetriesPerProxy; retry++) {
      try {
        // Report progress
        onProgress?.(
          proxyIndex + 1,
          totalProxies,
          retry === 0 ? 'trying' : 'retrying',
        );

        // Wait before retry (not on first attempt)
        if (retry > 0) {
          await waitWithBackoff(retry - 1);
        }

        const response = await fetchWithTimeout(proxyUrl, timeout);

        if (response.ok) {
          const text = await response.text();
          return { text, status: response.status, proxyIndex: proxyIndex + 1 };
        }

        // Handle specific HTTP errors
        if (response.status === 429) {
          // Rate limited — wait longer before retry
          await waitWithBackoff(retry, RATE_LIMIT_BASE_DELAY);
          errors.push(`Proxy ${String(proxyIndex + 1)}: Rate limited (429)`);
          continue;
        }

        if (response.status >= 500) {
          // Server error — retry
          errors.push(
            `Proxy ${String(proxyIndex + 1)}: Server error (${String(response.status)})`,
          );
          continue;
        }

        // Client errors (4xx except 429) — don't retry on this proxy
        errors.push(
          `Proxy ${String(proxyIndex + 1)}: HTTP ${String(response.status)}`,
        );
        break;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(
          `Proxy ${String(proxyIndex + 1)}, attempt ${String(retry + 1)}: ${errorMessage}`,
        );

        // Network errors — try next proxy instead of retrying
        if (
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('Failed to fetch')
        ) {
          break;
        }
      }
    }
  }

  // All proxies failed — sanitize error summary for UI display
  const sanitized = errors.map((e) =>
    e.replace(/https?:\/\/\S+/g, '[url]').split('\n')[0] ?? '',
  );
  const errorSummary =
    sanitized.length > 0
      ? `Tried ${String(totalProxies)} proxies. Last errors: ${sanitized.slice(-3).join('; ')}`
      : 'All CORS proxies failed';

  throw new ProxyFetchError(errorSummary, sanitized);
}
