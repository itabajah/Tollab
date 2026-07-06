import { fetchViaProxies } from './corsProxy'
import { extractPlaylistId, parseYouTubePlaylistHtml } from './youtube'
import { extractPanoptoInfo, parsePanoptoHtml } from './panopto'

/**
 * Orchestrators for bulk-importing recordings from a YouTube playlist or a
 * Panopto folder: fetch the page through the CORS-proxy chain, then hand the
 * HTML to the pure parsers in `youtube.ts` / `panopto.ts`. `fetchImpl`/`delayFn`
 * are injectable so the whole flow is testable without real network access.
 */

export type RecordingSource = 'youtube' | 'panopto'

/** A recording ready to be added; `name` is the source's own title. */
export interface ImportedRecording {
  name: string
  videoLink: string
}

export interface RecordingImportOptions {
  fetchImpl?: typeof fetch
  delayFn?: (ms: number) => Promise<void>
}

export class RecordingImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecordingImportError'
  }
}

/**
 * The console one-liner users run on their (signed-in) Panopto folder page. It
 * reads every session row from the fully-loaded DOM and `copy()`s a JSON array
 * of `{ t: title, u: viewerUrl }` to the clipboard. This sidesteps the auth +
 * CORS wall entirely — a private folder's sessions are only ever visible to the
 * logged-in browser, never to a server-side proxy — by running in the
 * authenticated origin. The result is pasted back and parsed by
 * {@link parsePanoptoConsoleData}.
 */
export const PANOPTO_CONSOLE_SNIPPET =
  "copy(JSON.stringify([...document.querySelectorAll('tr[aria-label][id]')]" +
  '.filter(r=>/^[a-f0-9-]{36}$/i.test(r.id))' +
  ".map(r=>({t:r.getAttribute('aria-label'),u:location.origin+'/Panopto/Pages/Viewer.aspx?id='+r.id}))))"

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

/**
 * Parses the clipboard JSON produced by {@link PANOPTO_CONSOLE_SNIPPET} into
 * recordings. Accepts the compact `{t,u}` shape the snippet emits as well as a
 * `{title,url}` shape; trims titles, de-duplicates by URL, and drops malformed
 * entries. Returns `[]` for anything that isn't a JSON array of video objects,
 * so callers can treat "empty" as "nothing usable pasted".
 */
export function parsePanoptoConsoleData(text: string): ImportedRecording[] {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return []
  }
  if (!Array.isArray(raw)) return []

  const recordings: ImportedRecording[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    const name = firstString(record, ['t', 'title', 'name'])
    const videoLink = firstString(record, ['u', 'url', 'videoLink'])
    if (!name || !videoLink || seen.has(videoLink)) continue
    seen.add(videoLink)
    recordings.push({ name: name.trim(), videoLink })
  }
  return recordings
}

function proxyOptions(options: RecordingImportOptions, validate: (body: string) => boolean) {
  return {
    validate,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.delayFn ? { delayFn: options.delayFn } : {}),
  }
}

/** A real YouTube playlist page embeds ytInitialData (empty playlists too); a
 *  proxy's own redirect/landing page has neither this nor watch links. */
const looksLikeYouTube = (html: string): boolean =>
  html.includes('ytInitialData') || html.includes('/watch?v=')

/** A Panopto page carries the Panopto chrome and/or the DeliveryInfo session
 *  blocks the parser reads; a proxy's own page has neither. */
const looksLikePanopto = (html: string): boolean =>
  /panopto/i.test(html) || html.includes('DeliveryInfo')

/** Fetches a YouTube playlist page and returns its videos as recordings. */
export async function runYoutubeImport(
  url: string,
  options: RecordingImportOptions = {},
): Promise<ImportedRecording[]> {
  const playlistId = extractPlaylistId(url)
  if (!playlistId) {
    throw new RecordingImportError('That does not look like a YouTube playlist link.')
  }
  const html = await fetchViaProxies(
    `https://www.youtube.com/playlist?list=${playlistId}`,
    proxyOptions(options, looksLikeYouTube),
  )
  const { videos } = parseYouTubePlaylistHtml(html)
  if (videos.length === 0) {
    throw new RecordingImportError('No videos found in that playlist.')
  }
  return videos.map((video) => ({ name: video.title, videoLink: video.url }))
}

/** Fetches a Panopto folder page and returns its sessions as recordings. */
export async function runPanoptoImport(
  url: string,
  options: RecordingImportOptions = {},
): Promise<ImportedRecording[]> {
  const info = extractPanoptoInfo(url)
  if (!info) {
    throw new RecordingImportError('That does not look like a Panopto link.')
  }
  const html = await fetchViaProxies(url, proxyOptions(options, looksLikePanopto))
  const videos = parsePanoptoHtml(html, info.baseDomain)
  if (videos.length === 0) {
    throw new RecordingImportError(
      "No recordings found. Panopto only lists a folder's videos when it's publicly viewable — " +
        "folders that require signing in can't be imported by link.",
    )
  }
  return videos.map((video) => ({ name: video.title, videoLink: video.url }))
}

/** Dispatches to the right importer for the chosen source. */
export function runRecordingImport(
  source: RecordingSource,
  url: string,
  options: RecordingImportOptions = {},
): Promise<ImportedRecording[]> {
  return source === 'youtube' ? runYoutubeImport(url, options) : runPanoptoImport(url, options)
}
