/**
 * Tollab CORS proxy — Cloudflare Worker.
 *
 * Import sources (Cheesefork ICS, YouTube, Panopto) don't send permissive CORS
 * headers, so the static tollab.co.il site can't read them from the browser.
 * This worker fetches them server-side — where CORS doesn't apply — and re-serves
 * the bytes with `Access-Control-Allow-Origin`, so the app can import reliably
 * instead of depending on flaky free public proxies.
 *
 * It's locked down two ways:
 *   1. Target host allowlist  → it can't be turned into an open proxy / SSRF.
 *   2. Caller origin allowlist → only your site's pages can use it.
 *
 * Deploy and wiring: see README.md in this folder. In short, after deploying set
 * the GitHub Actions repository variable
 *   VITE_CORS_PROXY = https://<your-worker>.workers.dev/?url={url}
 * and re-run the "Deploy to GitHub Pages" workflow.
 */

// Only these hosts (and their subdomains) may be proxied. Mirrors the dev-proxy
// allowlist in vite.config.ts — keep the two in sync.
const ALLOWED_HOST_SUFFIXES = [
  'cheesefork.cf',
  'youtube.com',
  'youtu.be',
  'googlevideo.com',
  'panopto.com',
  'panopto.eu',
  'technion.ac.il',
]

// Browser origins allowed to call this worker. Leave the array empty to allow
// any origin (returns `Access-Control-Allow-Origin: *`); list your domains to
// lock it to your site only. Local dev uses the Vite proxy, not this worker.
const ALLOWED_ORIGINS = [
  'https://tollab.co.il',
  'https://www.tollab.co.il',
  'http://localhost:5173',
]

// Give up on an unresponsive upstream so the worker invocation can't hang. The
// client aborts its own request sooner; this just stops a stalled upstream from
// keeping the worker running after the browser has already given up.
const UPSTREAM_TIMEOUT_MS = 20000

function hostAllowed(hostname) {
  const h = hostname.toLowerCase()
  return ALLOWED_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith('.' + suffix))
}

function corsHeaders(origin) {
  // Open to all when no origins are configured; otherwise echo an allowed
  // caller and fall back to the first configured origin for anyone else (so a
  // stranger's page gets a mismatched ACAO and the browser blocks the read).
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? '*'
      : origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin')
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      // Cache the preflight so repeated imports don't re-ask every time.
      return new Response(null, {
        status: 204,
        headers: { ...cors, 'Access-Control-Max-Age': '86400' },
      })
    }
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }

    const target = new URL(request.url).searchParams.get('url')
    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400, headers: cors })
    }

    let targetUrl
    try {
      targetUrl = new URL(target)
    } catch {
      return new Response('Invalid ?url= parameter', { status: 400, headers: cors })
    }
    if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
      return new Response('Only http(s) targets are allowed', { status: 400, headers: cors })
    }
    if (!hostAllowed(targetUrl.hostname)) {
      return new Response('Host not allowed: ' + targetUrl.hostname, { status: 403, headers: cors })
    }

    let upstream
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
    try {
      upstream = await fetch(targetUrl.toString(), {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          // A desktop UA so pages like YouTube return their full ytInitialData.
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
    } catch (err) {
      const timedOut = err && err.name === 'AbortError'
      const message = timedOut ? 'timed out' : err && err.message ? err.message : String(err)
      return new Response('Upstream fetch failed: ' + message, {
        status: timedOut ? 504 : 502,
        headers: cors,
      })
    } finally {
      clearTimeout(timeout)
    }

    // `redirect: 'follow'` above transparently follows 3xx, so re-check the FINAL
    // url's host: an allowed host that (accidentally or via an open redirect)
    // 3xx's off the allowlist must not have its body returned — otherwise the
    // allowlist could be side-stepped and this would become an open proxy.
    try {
      // A missing final url is treated as a failure (never return an
      // unvalidated body), not just an off-allowlist redirect.
      if (!upstream.url || !hostAllowed(new URL(upstream.url).hostname)) {
        return new Response('Redirected to a host that is not allowed', {
          status: 403,
          headers: cors,
        })
      }
    } catch {
      return new Response('Upstream returned an unparseable url', { status: 502, headers: cors })
    }

    const headers = new Headers(cors)
    const contentType = upstream.headers.get('content-type')
    if (contentType) headers.set('Content-Type', contentType)
    // Stream the upstream body straight through; preserve its status so the
    // client's proxy chain can react to 4xx/5xx and try the next proxy.
    return new Response(upstream.body, { status: upstream.status, headers })
  },
}
