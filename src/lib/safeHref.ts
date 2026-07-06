/**
 * Returns `url` only when it parses as an absolute http(s) URL, else `undefined`.
 *
 * User-entered link fields (recording video/slide URLs, homework links) accept
 * any string, and React renders a `javascript:` href verbatim — clicking it then
 * executes in the app origin with access to localStorage / the Firebase session.
 * Gate every user-provided anchor through this so only real web links stay
 * clickable; anything else renders as inert text.
 */
export function safeHref(url: string): string | undefined {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}
