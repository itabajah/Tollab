/**
 * YouTube playlist HTML parsing (legacy video-fetch.js port).
 * Primary strategy walks the embedded ytInitialData JSON; a regex scan over
 * watch?v= playlist links is used as a fallback.
 */

export interface PlaylistVideo {
  id: string
  title: string
  url: string
}

export interface ParsedPlaylist {
  title: string | null
  videos: PlaylistVideo[]
}

const WATCH_URL_PREFIX = 'https://www.youtube.com/watch?v='

/** Extracts the playlist id from the `list=` query param of a YouTube URL. */
export function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&]+)/)
  return match?.[1] ?? null
}

interface YtPlaylistVideoRenderer {
  videoId?: string
  title?: { runs?: Array<{ text?: string }> }
}

interface YtInitialData {
  metadata?: { playlistMetadataRenderer?: { title?: string } }
  header?: { playlistHeaderRenderer?: { title?: { simpleText?: string } } }
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
                      contents?: Array<{ playlistVideoRenderer?: YtPlaylistVideoRenderer }>
                    }
                  }>
                }
              }>
            }
          }
        }
      }>
    }
  }
}

function parseInitialData(html: string): YtInitialData | null {
  const dataMatch = html.match(/var ytInitialData = (.+?);<\/script>/)
  if (!dataMatch?.[1]) return null
  try {
    return JSON.parse(dataMatch[1]) as YtInitialData
  } catch {
    return null
  }
}

function videosFromInitialData(data: YtInitialData): PlaylistVideo[] {
  const videos: PlaylistVideo[] = []
  const contents =
    data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
      ?.playlistVideoListRenderer?.contents ?? []

  for (const item of contents) {
    const renderer = item.playlistVideoRenderer
    const videoId = renderer?.videoId
    if (!videoId) continue
    const title = renderer.title?.runs?.[0]?.text ?? `Video ${videos.length + 1}`
    videos.push({ id: videoId, title, url: WATCH_URL_PREFIX + videoId })
  }

  return videos
}

function videosFromWatchLinks(html: string): PlaylistVideo[] {
  const videos: PlaylistVideo[] = []
  const seenIds = new Set<string>()

  for (const match of html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})(?:&amp;|&)list=/g)) {
    const videoId = match[1]
    if (!videoId || seenIds.has(videoId)) continue
    seenIds.add(videoId)
    videos.push({
      id: videoId,
      title: `Video ${videos.length + 1}`,
      url: WATCH_URL_PREFIX + videoId,
    })
  }

  return videos
}

function extractTitle(html: string, data: YtInitialData | null): string | null {
  const metaTitle = data?.metadata?.playlistMetadataRenderer?.title
  if (metaTitle) return metaTitle

  const headerTitle = data?.header?.playlistHeaderRenderer?.title?.simpleText
  if (headerTitle) return headerTitle

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  if (titleMatch?.[1]) {
    const cleaned = titleMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim()
    return cleaned || null
  }

  return null
}

/**
 * Parses a YouTube playlist page into its title and videos. Walks the
 * ytInitialData playlist renderer when present, otherwise falls back to a
 * de-duplicated regex scan for watch?v= playlist links.
 */
export function parseYouTubePlaylistHtml(html: string): ParsedPlaylist {
  const data = parseInitialData(html)
  let videos = data ? videosFromInitialData(data) : []
  if (videos.length === 0) {
    videos = videosFromWatchLinks(html)
  }
  return { title: extractTitle(html, data), videos }
}
