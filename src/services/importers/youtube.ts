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

/** Legacy playlist item shape (pre-2024 YouTube). */
interface YtPlaylistVideoRenderer {
  videoId?: string
  title?: { runs?: Array<{ text?: string }> }
}

/** Current playlist item shape (2024+ YouTube uses `lockupViewModel`). */
interface YtLockupViewModel {
  contentId?: string
  contentType?: string
  metadata?: { lockupMetadataViewModel?: { title?: { content?: string } } }
}

/** Only the bits of ytInitialData the title extractor needs; videos are found
 *  by a generic walk (below), not a fixed container path. */
interface YtInitialData {
  metadata?: { playlistMetadataRenderer?: { title?: string } }
  header?: { playlistHeaderRenderer?: { title?: { simpleText?: string } } }
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

/**
 * Collects the playlist's videos by walking the WHOLE ytInitialData tree and
 * matching both the legacy `playlistVideoRenderer` and the current
 * `lockupViewModel` (contentType VIDEO) item shapes. A recursive scan is
 * deliberate: YouTube reshuffles the exact container path frequently (the old
 * fixed twoColumnBrowseResultsRenderer→…→playlistVideoRenderer path silently
 * stopped matching), but the item objects themselves are stable landmarks, so
 * matching them anywhere in the tree survives those layout changes.
 */
function videosFromInitialData(data: unknown): PlaylistVideo[] {
  const videos: PlaylistVideo[] = []
  const seen = new Set<string>()

  const add = (id: string | undefined, title: string | undefined): void => {
    if (!id || seen.has(id)) return
    seen.add(id)
    videos.push({ id, title: title || `Video ${videos.length + 1}`, url: WATCH_URL_PREFIX + id })
  }

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    const record = node as Record<string, unknown>

    const legacy = record.playlistVideoRenderer as YtPlaylistVideoRenderer | undefined
    if (legacy && typeof legacy === 'object') {
      add(legacy.videoId, legacy.title?.runs?.[0]?.text)
    }

    const lockup = record.lockupViewModel as YtLockupViewModel | undefined
    if (
      lockup &&
      typeof lockup === 'object' &&
      lockup.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO'
    ) {
      add(lockup.contentId, lockup.metadata?.lockupMetadataViewModel?.title?.content)
    }

    for (const key in record) walk(record[key])
  }

  walk(data)
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
