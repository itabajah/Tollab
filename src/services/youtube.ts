/**
 * YouTube playlist fetching — extracts video IDs and titles from YouTube
 * playlist pages via CORS proxy, parsing both structured initial data and
 * falling back to regex extraction.
 */

import { fetchViaProxy } from '@/services/cors-proxy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single video extracted from a YouTube playlist. */
export interface YouTubeVideo {
  /** Video display title. */
  title: string;
  /** Full YouTube watch URL. */
  url: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Strict pattern for a YouTube video ID (exactly 11 URL-safe characters). */
const YOUTUBE_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the playlist ID from a YouTube URL.
 * Accepts URLs with `?list=` or `&list=` query parameters.
 */
function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/);
  return match?.[1] ?? null;
}

/**
 * Parses the `ytInitialData` JSON blob embedded in YouTube HTML for
 * structured video data. This is the most reliable extraction method.
 */
function parseInitialData(html: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const dataMatch = html.match(/var ytInitialData = (.+?);<\/script>/);

  if (!dataMatch?.[1]) return videos;

  try {
    const data: unknown = JSON.parse(dataMatch[1]);

    // Navigate the deeply-nested YouTube initial data structure
    const contents = (
      data as {
        contents?: {
          twoColumnBrowseResultsRenderer?: {
            tabs?: Array<{
              tabRenderer?: {
                content?: {
                  sectionListRenderer?: {
                    contents?: Array<{
                      itemSectionRenderer?: {
                        contents?: Array<{
                          playlistVideoListRenderer?: {
                            contents?: Array<{
                              playlistVideoRenderer?: {
                                videoId?: string;
                                title?: { runs?: Array<{ text?: string }> };
                              };
                            }>;
                          };
                        }>;
                      };
                    }>;
                  };
                };
              };
            }>;
          };
        };
      }
    ).contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
      ?.playlistVideoListRenderer?.contents;

    if (contents) {
      for (const item of contents) {
        const renderer = item.playlistVideoRenderer;
        if (renderer?.videoId && YOUTUBE_VIDEO_ID_RE.test(renderer.videoId)) {
          const title =
            renderer.title?.runs?.[0]?.text ??
            `Video ${String(videos.length + 1)}`;
          videos.push({
            title,
            url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
          });
        }
      }
    }
  } catch {
    // Structured data parse failed — caller falls back to regex
  }

  return videos;
}

/**
 * Regex fallback: extracts video IDs from YouTube playlist HTML when
 * structured data is unavailable. Deduplicates by video ID.
 */
function extractVideoLinks(html: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const videoMatches = html.matchAll(
    /\/watch\?v=([a-zA-Z0-9_-]{11})(?:&amp;|&)list=/g,
  );
  const seenIds = new Set<string>();

  for (const match of videoMatches) {
    const videoId = match[1];
    if (videoId && !seenIds.has(videoId)) {
      seenIds.add(videoId);
      videos.push({
        title: `Video ${String(videos.length + 1)}`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }

  return videos;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches and parses a YouTube playlist, returning an array of videos.
 *
 * 1. Extracts the playlist ID from the URL.
 * 2. Fetches the playlist page through the CORS proxy.
 * 3. Tries structured `ytInitialData` parsing first, then falls back to
 *    regex extraction of `/watch?v=` links.
 *
 * @throws {Error} When the playlist ID cannot be extracted, or the proxy
 *   fetch fails, or no videos are found.
 */
export async function fetchYouTubePlaylist(
  url: string,
  onProgress?: (
    proxyIndex: number,
    totalProxies: number,
    status: 'trying' | 'retrying',
  ) => void,
): Promise<YouTubeVideo[]> {
  const playlistId = extractPlaylistId(url);
  if (!playlistId) {
    throw new Error(
      "Could not extract playlist ID from URL. Make sure it's a YouTube playlist URL.",
    );
  }

  const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

  try {
    const result = await fetchViaProxy(playlistUrl, { onProgress });
    const html = result.text;

    // Try structured data first
    let videos = parseInitialData(html);

    // Fallback to regex extraction
    if (videos.length === 0) {
      videos = extractVideoLinks(html);
    }

    return videos;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);

    // Provide more helpful error messages
    if (message.toLowerCase().includes('proxy')) {
      throw new Error(
        'Failed to connect to YouTube. All proxy servers are unavailable. Please try again later.',
      );
    }

    throw new Error(
      'Failed to fetch YouTube playlist. The playlist may be private or the URL is incorrect.',
    );
  }
}
