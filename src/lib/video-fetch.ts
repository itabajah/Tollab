import { VideoInfo, PlaylistImportResult } from '@/types';

// ============================================
// CORS Proxies for fetching external content
// ============================================

const CORS_PROXIES = [
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithCorsProxy(url: string): Promise<string> {
  for (const getProxyUrl of CORS_PROXIES) {
    try {
      const response = await fetch(getProxyUrl(url));
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn('CORS proxy failed:', error);
    }
  }
  throw new Error('All CORS proxies failed');
}

// ============================================
// YouTube Functions
// ============================================

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract playlist ID from YouTube URL
 */
export function extractYouTubePlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Get YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Check if URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

/**
 * Fetch videos from a YouTube playlist
 * Note: This uses page scraping since we don't have API access
 */
export async function fetchYouTubePlaylist(playlistUrl: string): Promise<PlaylistImportResult> {
  const playlistId = extractYouTubePlaylistId(playlistUrl);

  if (!playlistId) {
    return {
      success: false,
      videos: [],
      error: 'לא ניתן לזהות את הפלייליסט',
    };
  }

  try {
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;
    const html = await fetchWithCorsProxy(url);

    // Parse video data from YouTube's initial data
    const videos: VideoInfo[] = [];

    // Look for video entries in the HTML
    // YouTube stores data in a JSON object called ytInitialData
    const dataMatch = html.match(/var ytInitialData = ({.+?});<\/script>/);

    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);
        const contents =
          data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
            ?.playlistVideoListRenderer?.contents;

        if (contents) {
          for (const item of contents) {
            const renderer = item?.playlistVideoRenderer;
            if (renderer) {
              videos.push({
                title: renderer.title?.runs?.[0]?.text || 'ללא כותרת',
                url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
                thumbnail: getYouTubeThumbnail(renderer.videoId),
              });
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing YouTube data:', parseError);
      }
    }

    // Fallback: try regex pattern matching
    if (videos.length === 0) {
      const videoPattern = /watch\?v=([a-zA-Z0-9_-]{11}).*?title="([^"]+)"/g;
      let match;

      while ((match = videoPattern.exec(html)) !== null) {
        const videoId = match[1];
        const title = match[2]
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        // Avoid duplicates
        if (!videos.some((v) => v.url.includes(videoId))) {
          videos.push({
            title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: getYouTubeThumbnail(videoId),
          });
        }
      }
    }

    if (videos.length === 0) {
      return {
        success: false,
        videos: [],
        error: 'לא נמצאו סרטונים בפלייליסט',
      };
    }

    return {
      success: true,
      videos,
    };
  } catch (error) {
    console.error('YouTube playlist fetch error:', error);
    return {
      success: false,
      videos: [],
      error: 'שגיאה בטעינת הפלייליסט',
    };
  }
}

// ============================================
// Panopto Functions
// ============================================

/**
 * Check if URL is a Panopto URL
 */
export function isPanoptoUrl(url: string): boolean {
  return url.includes('panopto');
}

/**
 * Extract video ID from Panopto URL
 */
export function extractPanoptoVideoId(url: string): string | null {
  const match = url.match(/id=([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

/**
 * Parse Panopto content pasted by user
 * Users typically copy-paste a list from the Panopto interface
 */
export function parsePanoptoContent(content: string): VideoInfo[] {
  const videos: VideoInfo[] = [];
  const lines = content.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();

    // Try to extract URL and title
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+panopto[^\s]+)/i);
    if (urlMatch) {
      // Get title: either before the URL or use a default
      const titlePart = trimmed.replace(urlMatch[0], '').trim();
      videos.push({
        title: titlePart || `הקלטה ${videos.length + 1}`,
        url: urlMatch[0],
      });
    } else if (trimmed && !trimmed.startsWith('http')) {
      // Just a title - will be added when URL comes later
      videos.push({
        title: trimmed,
        url: '',
      });
    }
  }

  return videos.filter((v) => v.url || v.title);
}

// ============================================
// Generic Video URL Handling
// ============================================

/**
 * Get embed URL for a video
 */
export function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const ytVideoId = extractYouTubeVideoId(url);
  if (ytVideoId) {
    return `https://www.youtube.com/embed/${ytVideoId}`;
  }

  // Panopto - return as-is, needs iframe with special handling
  if (isPanoptoUrl(url)) {
    return url;
  }

  // For other video URLs, try to return the original
  return url;
}

/**
 * Get video thumbnail URL
 */
export function getVideoThumbnail(url: string): string | null {
  if (!url) return null;

  // YouTube
  const ytVideoId = extractYouTubeVideoId(url);
  if (ytVideoId) {
    return getYouTubeThumbnail(ytVideoId);
  }

  return null;
}

/**
 * Validate video URL
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;

  try {
    new URL(url);
    return isYouTubeUrl(url) || isPanoptoUrl(url) || url.includes('video');
  } catch {
    return false;
  }
}
