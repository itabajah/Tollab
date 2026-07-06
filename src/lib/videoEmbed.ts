export type VideoPlatform = 'youtube' | 'panopto' | 'unknown'

export function detectVideoPlatform(url: string): VideoPlatform {
  if (!url) return 'unknown'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.toLowerCase().includes('panopto')) return 'panopto'
  return 'unknown'
}

export interface VideoEmbedInfo {
  embedUrl: string | null
  platform: VideoPlatform
}

export function getVideoEmbedInfo(url: string): VideoEmbedInfo {
  if (!url) return { embedUrl: null, platform: 'unknown' }
  const platform = detectVideoPlatform(url)

  if (platform === 'youtube') {
    let videoId: string | undefined
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0]
    } else {
      // Path forms (youtube.com/embed/<id>, /shorts/<id>) and the watch-form
      // ?v=/&v= query param. Ids are exactly 11 url-safe chars; the m./music.
      // subdomains are covered because the host still contains "youtube.com".
      videoId =
        /youtube\.com\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/.exec(url)?.[1] ??
        /[?&]v=([A-Za-z0-9_-]{11})/.exec(url)?.[1]
    }
    // Keep the embed URL parameter-free (legacy note: extra params trigger Error 153).
    if (videoId) return { embedUrl: `https://www.youtube.com/embed/${videoId}`, platform }
  }

  if (platform === 'panopto') {
    // Require a query/fragment boundary before "id=" so "folderID=<uuid>" (a
    // Sessions/List folder) is not mistaken for a session id.
    const id = /[?&#]id=([a-f0-9-]{36})/i.exec(url)?.[1]
    const origin = panoptoOrigin(url)
    if (id && origin) {
      return {
        embedUrl: `${origin}/Panopto/Pages/Embed.aspx?id=${id}&autoplay=false&offerviewer=true&showtitle=true&showbrand=false&captions=true&interactivity=all`,
        platform,
      }
    }
  }

  return { embedUrl: null, platform }
}

/**
 * The origin to embed a Panopto session from — but only when it is an actual
 * Panopto host. The session id is reflected into an iframe `src`, so the origin
 * must never be an arbitrary domain taken from user input. A substring check like
 * `includes('panopto')` would admit attacker-registrable hosts (panopto.attacker.com,
 * mypanopto.net); match real Panopto/Technion domains by host suffix instead.
 */
function panoptoOrigin(url: string): string | null {
  try {
    const { hostname, origin } = new URL(url)
    const h = hostname.toLowerCase()
    const ok =
      h === 'panopto.com' ||
      h.endsWith('.panopto.com') ||
      h === 'panopto.eu' ||
      h.endsWith('.panopto.eu') ||
      h.endsWith('.technion.ac.il')
    return ok ? origin : null
  } catch {
    return null
  }
}

export function supportsInlinePreview(url: string): boolean {
  return getVideoEmbedInfo(url).embedUrl !== null
}
