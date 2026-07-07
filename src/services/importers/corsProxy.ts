/**
 * CORS proxy chain with retry, exponential backoff and per-attempt timeout.
 * Mirrors the legacy fetchWithCorsProxy behavior (video-fetch.js) with
 * injectable fetch/delay for deterministic tests.
 */

/**
 * Public CORS proxies, most-reliable-first. Free proxies rot without notice, so
 * this list is a best-effort *fallback of last resort*: the runtime chain (see
 * {@link resolveProxies}) prefers a proxy you control — the Vite dev middleware
 * in development, or a VITE_CORS_PROXY pointed at your own Cloudflare Worker in
 * production (see workers/cors-proxy/). For a site that must import reliably,
 * configure VITE_CORS_PROXY; do not depend on the entries below.
 *
 * History (checked 2026-07): the free proxies keep rotting. corsproxy.org
 * 301-redirects to an unrelated VPN page; codetabs now hangs then answers 522;
 * corsproxy.io returns 403 without an API key; allorigins flip-flops between a
 * slow 200 and 408/500 from one request to the next. proxy.cors.sh was the only
 * one returning the exact upstream body cleanly, so it now leads, allorigins is
 * kept as a second chance, and the dead-and-slow codetabs entry was dropped.
 * A proxy's own challenge/landing page can still come back as a 200, so callers
 * that know their payload shape should pass `validate` (see runIcsImport).
 */
export const CORS_PROXIES: Array<(url: string) => string> = [
  // proxy.cors.sh takes the full target as a raw path and echoes the upstream
  // body with `Access-Control-Allow-Origin: *`.
  (url) => `https://proxy.cors.sh/${url}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
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

// A proxy that is actually going to answer does so in a few seconds (the
// working ones measured 1–5s); anything past this is a proxy that has silently
// died, so we abort and move on rather than make the user wait — batch imports
// run these serially, so a slow dead proxy is felt once per semester.
const DEFAULT_TIMEOUT_MS = 12000
const DEFAULT_RETRIES_PER_PROXY = 2
const INITIAL_RETRY_DELAY_MS = 500
const RATE_LIMIT_DELAY_MS = 2000
const MAX_RETRY_DELAY_MS = 5000
const BACKOFF_MULTIPLIER = 2

export class ProxyFetchError extends Error {
  readonly attempts: number
  /**
   * True when a proxy authoritatively reported the target as *not found* (a 404,
   * or the worker's `X-Proxy-Status: 404` signal). Callers use this to skip a
   * missing resource quietly — a batch import expects semesters that don't exist.
   */
  readonly notFound: boolean

  constructor(message: string, attempts: number, notFound = false) {
    super(message)
    this.name = 'ProxyFetchError'
    this.attempts = attempts
    this.notFound = notFound
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

        // Authoritative "not found": the target was reached and has no such
        // resource (a missing semester in a batch, a mistyped link). Every proxy
        // would return the same, so stop the whole chain and flag it notFound so
        // the caller can skip it quietly — otherwise the fallback proxies get
        // tried and spray the console with CORS errors for a file that isn't
        // there. Our worker reports this as a 200 + `X-Proxy-Status: 404` (a bare
        // 404 status makes the browser log its own error); public proxies 404.
        if (response.status === 404 || response.headers.get('X-Proxy-Status') === '404') {
          throw new ProxyFetchError(`Target not found (404): ${url}`, attempts, true)
        }

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
        // A terminal "not found" short-circuits the whole chain (thrown above).
        if (error instanceof ProxyFetchError && error.notFound) throw error
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
