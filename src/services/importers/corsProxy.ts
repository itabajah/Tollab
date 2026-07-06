/**
 * CORS proxy chain with retry, exponential backoff and per-attempt timeout.
 * Mirrors the legacy fetchWithCorsProxy behavior (video-fetch.js) with
 * injectable fetch/delay for deterministic tests.
 */

/**
 * Public CORS proxies, most-reliable-first. Free proxies rot without notice, so
 * this list is a best-effort *fallback*: the runtime chain (see
 * {@link resolveProxies}) prefers a same-origin proxy when one is available —
 * the Vite dev middleware in development, or a VITE_CORS_PROXY you point at your
 * own worker in production.
 *
 * History: the original trio (codetabs, corsproxy.org, allorigins) all rotted —
 * corsproxy.org now 301-redirects to an unrelated VPN page and codetabs answers
 * 522s, while allorigins still serves target HTML — so allorigins leads and
 * corsproxy.org was dropped entirely.
 */
export const CORS_PROXIES: Array<(url: string) => string> = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
]

/**
 * Same-origin dev proxy served by the Vite middleware (see vite.config.ts). A
 * server-side fetch has no CORS constraints, so this is tried first in dev and
 * makes local imports independent of the flaky public proxies above.
 */
const devProxy = (url: string): string => `/__cors?url=${encodeURIComponent(url)}`

/**
 * An optional user-configured proxy from `VITE_CORS_PROXY`, for production
 * (GitHub Pages is static and can't proxy itself). Point it at e.g. a
 * Cloudflare Worker: `VITE_CORS_PROXY="https://my-worker.dev/?url={url}"`. The
 * `{url}` placeholder is replaced with the encoded target; without it, the
 * encoded target is appended.
 */
function customProxy(): ((url: string) => string) | null {
  const template = import.meta.env.VITE_CORS_PROXY as string | undefined
  if (!template) return null
  return (url) =>
    template.includes('{url}')
      ? template.replaceAll('{url}', encodeURIComponent(url))
      : template + encodeURIComponent(url)
}

/**
 * The proxy chain to try at runtime: the same-origin dev proxy first (dev
 * only), then a configured custom proxy, then the public fallbacks. Exposed so
 * callers/tests can inspect or override it via {@link FetchViaProxiesOptions}.
 */
export function resolveProxies(): Array<(url: string) => string> {
  const chain: Array<(url: string) => string> = []
  if (import.meta.env.DEV) chain.push(devProxy)
  const custom = customProxy()
  if (custom) chain.push(custom)
  chain.push(...CORS_PROXIES)
  return chain
}

const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_RETRIES_PER_PROXY = 2
const INITIAL_RETRY_DELAY_MS = 500
const RATE_LIMIT_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 5000
const BACKOFF_MULTIPLIER = 2

export class ProxyFetchError extends Error {
  readonly attempts: number

  constructor(message: string, attempts: number) {
    super(message)
    this.name = 'ProxyFetchError'
    this.attempts = attempts
  }
}

export interface FetchViaProxiesOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
  retriesPerProxy?: number
  delayFn?: (ms: number) => Promise<void>
  /** Proxy chain to try, most-preferred first. Defaults to {@link resolveProxies}. */
  proxies?: Array<(url: string) => string>
  /**
   * Optional body check. Some proxies answer 200 with their OWN page (a
   * redirect/landing/error page) instead of the target — which would otherwise
   * be accepted as a successful fetch. When provided and it returns false, the
   * response is rejected and the next proxy is tried.
   */
  validate?: (body: string) => boolean
}

const defaultDelay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const backoffDelay = (attempt: number, baseDelay: number): number =>
  Math.min(baseDelay * BACKOFF_MULTIPLIER ** attempt, MAX_RETRY_DELAY_MS)

/**
 * Fetches a URL through the CORS proxy chain and resolves with the body text.
 *
 * Per proxy, up to `retriesPerProxy` attempts are made with exponential
 * backoff between retries. 429 and 5xx responses retry the same proxy, other
 * 4xx responses skip to the next proxy, and thrown errors (network failures,
 * timeouts) move on to the next attempt. Every attempt is bounded by an
 * AbortController timeout. Throws {@link ProxyFetchError} when all fail.
 */
export async function fetchViaProxies(
  url: string,
  opts: FetchViaProxiesOptions = {},
): Promise<string> {
  const fetchImpl =
    opts.fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init))
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retriesPerProxy = opts.retriesPerProxy ?? DEFAULT_RETRIES_PER_PROXY
  const delayFn = opts.delayFn ?? defaultDelay
  const validate = opts.validate
  const proxies = opts.proxies ?? resolveProxies()

  const errors: string[] = []
  let attempts = 0

  for (const [proxyIndex, makeProxyUrl] of proxies.entries()) {
    const proxyUrl = makeProxyUrl(url)

    for (let retry = 0; retry < retriesPerProxy; retry++) {
      if (retry > 0) {
        await delayFn(backoffDelay(retry - 1, INITIAL_RETRY_DELAY_MS))
      }

      attempts++
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetchImpl(proxyUrl, {
          signal: controller.signal,
          headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        })

        if (response.ok) {
          const body = await response.text()
          if (validate && !validate(body)) {
            // 200, but not the page we asked for (proxy served its own content).
            errors.push(`Proxy ${proxyIndex + 1}: response failed validation`)
            break
          }
          return body
        }

        if (response.status === 429) {
          // Rate limited: flat longer wait, then retry the same proxy.
          errors.push(`Proxy ${proxyIndex + 1}: rate limited (429)`)
          await delayFn(RATE_LIMIT_DELAY_MS)
          continue
        }

        if (response.status >= 500) {
          // Server error: retry the same proxy.
          errors.push(`Proxy ${proxyIndex + 1}: server error (${response.status})`)
          continue
        }

        // Other client errors: this proxy will not serve the URL, move on.
        errors.push(`Proxy ${proxyIndex + 1}: HTTP ${response.status}`)
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`Proxy ${proxyIndex + 1}, attempt ${retry + 1}: ${message}`)
      } finally {
        clearTimeout(timeoutId)
      }
    }
  }

  const lastErrors = errors.length > 0 ? ` Last errors: ${errors.slice(-3).join('; ')}` : ''
  throw new ProxyFetchError(
    `Tried ${proxies.length} proxies (${attempts} attempts).${lastErrors}`,
    attempts,
  )
}
