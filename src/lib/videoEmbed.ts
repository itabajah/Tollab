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
      videoId = /[?&]v=([^&#]+)/.exec(url)?.[1]
    }
    // Keep the embed URL parameter-free (legacy note: extra params trigger Error 153).
    if (videoId) return { embedUrl: `https://www.youtube.com/embed/${videoId}`, platform }
  }

  if (platform === 'panopto') {
    const id = /id=([a-f0-9-]{36})/i.exec(url)?.[1]
    const domain = /(https?:\/\/[^/]+)/.exec(url)?.[1]
    if (id && domain) {
      return {
        embedUrl: `${domain}/Panopto/Pages/Embed.aspx?id=${id}&autoplay=false&offerviewer=true&showtitle=true&showbrand=false&captions=true&interactivity=all`,
        platform,
      }
    }
  }

  return { embedUrl: null, platform }
}

export function supportsInlinePreview(url: string): boolean {
  return getVideoEmbedInfo(url).embedUrl !== null
}
