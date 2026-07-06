/**
 * Panopto folder/session extraction (legacy video-fetch.js port).
 * Runs a cascade of extractors over folder-page HTML with regexes (no DOM —
 * this runs in node too).
 */

export interface PanoptoVideo {
  id: string
  title: string
  url: string
}

export interface PanoptoUrlInfo {
  baseDomain: string
  folderId: string | null
}

const FOLDER_ID_PATTERNS = [
  /folderID=["']([a-f0-9-]+)["']/i,
  /folderID=([a-f0-9-]+)/i,
  /folder[/=]([a-f0-9-]+)/i,
]

/**
 * Extracts the base domain (https origin) and folder id from a Panopto URL.
 * The folderID param is matched case-insensitively, on both the decoded and
 * raw URL. Returns null when no https origin is present.
 */
export function extractPanoptoInfo(url: string): PanoptoUrlInfo | null {
  const domainMatch = url.match(/(https:\/\/[^/]+)/)
  const baseDomain = domainMatch?.[1]
  if (!baseDomain) return null

  let decodedUrl: string
  try {
    decodedUrl = decodeURIComponent(url)
  } catch {
    decodedUrl = url
  }

  let folderId: string | null = null
  for (const pattern of FOLDER_ID_PATTERNS) {
    const match = decodedUrl.match(pattern) ?? url.match(pattern)
    if (match?.[1]) {
      folderId = match[1]
      break
    }
  }

  return { baseDomain, folderId }
}

const viewerUrl = (baseDomain: string, id: string): string =>
  `${baseDomain}/Panopto/Pages/Viewer.aspx?id=${id}`

function collectDeliveryInfo(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  for (const match of html.matchAll(/DeliveryInfo[^{]*({[^}]+})/g)) {
    const json = match[1]
    if (!json) continue
    try {
      const data = JSON.parse(json) as { SessionId?: string; SessionName?: string }
      if (data.SessionId && data.SessionName && !seenIds.has(data.SessionId)) {
        seenIds.add(data.SessionId)
        videos.push({
          id: data.SessionId,
          title: data.SessionName,
          url: viewerUrl(baseDomain, data.SessionId),
        })
      }
    } catch {
      // Malformed DeliveryInfo block: ignore and keep scanning.
    }
  }
}

function collectHrefLinks(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  const pattern = /href="[^"]*(?:id=|\/Viewer\.aspx\?id=)([a-f0-9-]{36})[^"]*"[^>]*>([^<]+)/gi
  for (const match of html.matchAll(pattern)) {
    const id = match[1]
    const title = match[2]?.trim() ?? ''
    if (!id || seenIds.has(id)) continue
    if (title.length <= 1 || title.includes('{') || title.includes('var ')) continue
    seenIds.add(id)
    videos.push({ id, title, url: viewerUrl(baseDomain, id) })
  }
}

function collectSessionIds(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  const pattern = /id[=:][\s"']*([a-f0-9-]{36})[\s"']*[^>]*>([^<]{3,100})/gi
  for (const match of html.matchAll(pattern)) {
    const id = match[1]
    const title = match[2]?.trim() ?? ''
    if (!id || seenIds.has(id)) continue
    if (!title || title.includes('{') || title.includes('function')) continue
    seenIds.add(id)
    videos.push({ id, title, url: viewerUrl(baseDomain, id) })
  }
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

function collectJsonSessions(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  if (videos.length > 0) return

  const jsonPatterns = [
    /Sessions\s*[=:]\s*(\[[^\]]+\])/s,
    /"sessions"\s*:\s*(\[[^\]]+\])/s,
    /SessionList\s*[=:]\s*(\[[^\]]+\])/s,
  ]

  for (const pattern of jsonPatterns) {
    const dataMatch = html.match(pattern)
    if (!dataMatch?.[1]) continue
    try {
      const sessions = JSON.parse(dataMatch[1]) as unknown[]
      for (const session of sessions) {
        if (typeof session !== 'object' || session === null) continue
        const record = session as Record<string, unknown>
        const id = firstString(record, ['Id', 'id', 'SessionId'])
        const name = firstString(record, ['Name', 'name', 'SessionName', 'Title'])
        if (id && name && !seenIds.has(id)) {
          seenIds.add(id)
          videos.push({ id, title: name, url: viewerUrl(baseDomain, id) })
        }
      }
      break
    } catch {
      // Malformed sessions JSON: try the next pattern.
    }
  }
}

/**
 * Extracts videos from Panopto folder-page HTML using the legacy extractor
 * cascade: DeliveryInfo JSON blocks, Viewer.aspx href links, bare 36-char
 * session UUID patterns, and (only when nothing matched) JSON Sessions
 * blocks. Results are de-duplicated by session id.
 */
export function parsePanoptoHtml(html: string, baseDomain: string): PanoptoVideo[] {
  const videos: PanoptoVideo[] = []
  const seenIds = new Set<string>()

  collectDeliveryInfo(html, baseDomain, videos, seenIds)
  collectHrefLinks(html, baseDomain, videos, seenIds)
  collectSessionIds(html, baseDomain, videos, seenIds)
  collectJsonSessions(html, baseDomain, videos, seenIds)

  return videos
}
