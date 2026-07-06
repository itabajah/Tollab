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
    throw new RecordingImportError('No recordings found in that Panopto folder.')
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
