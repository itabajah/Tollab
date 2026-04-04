/**
 * Video platform detection and embed URL extraction.
 */

/** Supported video platforms. */
export type VideoPlatform = 'youtube' | 'panopto' | 'unknown';

/** Embed information for a video URL. */
export interface VideoEmbedInfo {
  /** Embeddable iframe URL, or `null` when the platform is unsupported. */
  embedUrl: string | null;
  /** Detected platform. */
  platform: VideoPlatform;
}

/**
 * Detects the video platform from a URL string.
 */
export function detectVideoPlatform(url: string): VideoPlatform {
  if (!url) return 'unknown';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('panopto')) return 'panopto';
  return 'unknown';
}

/**
 * Extracts the embed URL and detected platform for a video link.
 *
 * Supports YouTube (standard & shortened URLs) and Panopto.
 */
export function getVideoEmbedInfo(url: string): VideoEmbedInfo {
  if (!url) return { embedUrl: null, platform: 'unknown' };

  const platform = detectVideoPlatform(url);

  if (platform === 'youtube') {
    let videoId: string | null | undefined = null;
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
    } else if (url.includes('youtube.com')) {
      const match = url.match(/[?&]v=([^&#]+)/);
      videoId = match?.[1];
    }
    if (videoId) {
      return {
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        platform,
      };
    }
  }

  if (platform === 'panopto') {
    const idMatch = url.match(/id=([a-f0-9-]{36})/i);
    const domainMatch = url.match(/(https?:\/\/[^/]+)/);
    if (idMatch && domainMatch) {
      const videoId = idMatch[1];
      const domain = domainMatch[1];
      return {
        embedUrl: `${domain}/Panopto/Pages/Embed.aspx?id=${videoId}&autoplay=false&offerviewer=true&showtitle=true&showbrand=false&captions=true&interactivity=all`,
        platform,
      };
    }
  }

  return { embedUrl: null, platform };
}

/**
 * Returns `true` when the given URL can be embedded as an inline video preview.
 */
export function supportsInlinePreview(url: string): boolean {
  const { embedUrl } = getVideoEmbedInfo(url);
  return embedUrl !== null;
}
