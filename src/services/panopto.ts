/**
 * Panopto video parsing — extracts video data from Panopto folder pages.
 *
 * Supports three input modes mirroring the legacy JS:
 * 1. **Clipboard JSON** — structured `{SessionId, SessionName}` objects
 *    pasted/selected by the user from the Panopto UI.
 * 2. **Folder HTML** — HTML fetched from a Panopto folder URL (via CORS proxy),
 *    with multiple extraction strategies: DeliveryInfo JSON, href links,
 *    session ID patterns, and session-list JSON blocks.
 * 3. **Saved HTML file** — a locally saved Panopto folder page with `<tr>`
 *    row patterns and fallback viewer-link extraction.
 */

import { fetchViaProxy } from '@/services/cors-proxy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single video extracted from Panopto. */
export interface PanoptoVideo {
  /** Video display title. */
  title: string;
  /** Panopto Viewer URL. */
  url: string;
}

/** Info extracted from a Panopto folder URL. */
interface PanoptoUrlInfo {
  folderId: string | null;
  baseDomain: string | null;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Extracts folder ID and base domain from a Panopto folder URL.
 * Tries multiple URL patterns for resilience.
 */
function extractPanoptoInfo(url: string): PanoptoUrlInfo {
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch {
    decodedUrl = url;
  }

  const patterns: RegExp[] = [
    /folderID=["']([a-f0-9-]+)["']/i,
    /folderID=([a-f0-9-]+)/i,
    /folder[/=]([a-f0-9-]+)/i,
  ];

  let folderId: string | null = null;
  for (const pattern of patterns) {
    const match = decodedUrl.match(pattern) ?? url.match(pattern);
    if (match?.[1]) {
      folderId = match[1];
      break;
    }
  }

  const domainMatch = url.match(/(https:\/\/[^/]+)/);
  const baseDomain = domainMatch?.[1] ?? null;

  return { folderId, baseDomain };
}

// ---------------------------------------------------------------------------
// HTML extraction strategies (folder page via proxy)
// ---------------------------------------------------------------------------

function extractDeliveryInfo(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  const deliveryMatches = html.matchAll(/DeliveryInfo[^{]*(\{[^}]+\})/g);
  for (const match of deliveryMatches) {
    try {
      const data = JSON.parse(match[1]!) as Record<string, unknown>;
      const sessionId = data['SessionId'] as string | undefined;
      const sessionName = data['SessionName'] as string | undefined;
      if (sessionId && sessionName && !seenIds.has(sessionId)) {
        seenIds.add(sessionId);
        videos.push({
          title: sessionName,
          url: `${baseDomain}/Panopto/Pages/Viewer.aspx?id=${sessionId}`,
        });
      }
    } catch {
      // Skip unparseable delivery info blocks
    }
  }
}

function extractHrefLinks(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  const hrefMatches = html.matchAll(
    /href="[^"]*(?:id=|\/Viewer\.aspx\?id=)([a-f0-9-]{36})[^"]*"[^>]*>([^<]+)/gi,
  );
  for (const match of hrefMatches) {
    const sessionId = match[1];
    const title = match[2]?.trim();

    if (
      sessionId &&
      title &&
      !seenIds.has(sessionId) &&
      title.length > 1 &&
      !title.includes('{') &&
      !title.includes('var ')
    ) {
      seenIds.add(sessionId);
      videos.push({
        title,
        url: `${baseDomain}/Panopto/Pages/Viewer.aspx?id=${sessionId}`,
      });
    }
  }
}

function extractSessionIds(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  const sessionMatches = html.matchAll(
    /id[=:][\s"']*([a-f0-9-]{36})[\s"']*[^>]*>([^<]{3,100})/gi,
  );
  for (const match of sessionMatches) {
    const sessionId = match[1];
    const title = match[2]?.trim();

    if (
      sessionId &&
      title &&
      !seenIds.has(sessionId) &&
      !title.includes('{') &&
      !title.includes('function')
    ) {
      seenIds.add(sessionId);
      videos.push({
        title,
        url: `${baseDomain}/Panopto/Pages/Viewer.aspx?id=${sessionId}`,
      });
    }
  }
}

function extractJsonData(
  html: string,
  baseDomain: string,
  videos: PanoptoVideo[],
  seenIds: Set<string>,
): void {
  // Only used when other methods found nothing
  if (videos.length > 0) return;

  const jsonPatterns: RegExp[] = [
    /Sessions\s*[=:]\s*(\[[^\]]+\])/s,
    /"sessions"\s*:\s*(\[[^\]]+\])/s,
    /SessionList\s*[=:]\s*(\[[^\]]+\])/s,
  ];

  for (const pattern of jsonPatterns) {
    const dataMatch = html.match(pattern);
    if (dataMatch?.[1]) {
      try {
        const sessions = JSON.parse(dataMatch[1]) as Array<
          Record<string, unknown>
        >;
        for (const session of sessions) {
          const id = (session['Id'] ??
            session['id'] ??
            session['SessionId']) as string | undefined;
          const name = (session['Name'] ??
            session['name'] ??
            session['SessionName'] ??
            session['Title']) as string | undefined;
          if (id && name && !seenIds.has(id)) {
            seenIds.add(id);
            videos.push({
              title: name,
              url: `${baseDomain}/Panopto/Pages/Viewer.aspx?id=${id}`,
            });
          }
        }
        break;
      } catch {
        // Skip unparseable session JSON blocks
      }
    }
  }
}

/**
 * Applies all extraction strategies to a Panopto folder HTML page.
 */
function parsePanoptoFolderHtml(
  html: string,
  baseDomain: string,
): PanoptoVideo[] {
  const videos: PanoptoVideo[] = [];
  const seenIds = new Set<string>();

  extractDeliveryInfo(html, baseDomain, videos, seenIds);
  extractHrefLinks(html, baseDomain, videos, seenIds);
  extractSessionIds(html, baseDomain, videos, seenIds);
  extractJsonData(html, baseDomain, videos, seenIds);

  return videos;
}

// ---------------------------------------------------------------------------
// HTML entity decoder for saved-page parsing
// ---------------------------------------------------------------------------

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses structured Panopto clipboard JSON data into video objects.
 *
 * Expects an array of `{SessionId, SessionName, ...}` (or equivalent
 * `{id, title, url}`) objects as serialized JSON text, or a single object.
 */
export function parsePanoptoClipboard(jsonText: string): PanoptoVideo[] {
  const parsed: unknown = JSON.parse(jsonText);
  const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  const videos: PanoptoVideo[] = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;

    const title =
      (obj['SessionName'] as string | undefined) ??
      (obj['title'] as string | undefined) ??
      (obj['name'] as string | undefined) ??
      (obj['Name'] as string | undefined);
    const url = obj['url'] as string | undefined;
    const sessionId =
      (obj['SessionId'] as string | undefined) ??
      (obj['id'] as string | undefined) ??
      (obj['Id'] as string | undefined);

    if (title && url) {
      videos.push({ title, url });
    } else if (title && sessionId) {
      // Construct a generic viewer URL (domain must be supplied by caller context)
      videos.push({ title, url: sessionId });
    }
  }

  return videos;
}

/**
 * Fetches and parses a Panopto folder page via CORS proxy.
 *
 * @throws {Error} When the folder ID or domain can't be extracted, or the
 *   fetch fails.
 */
export async function fetchPanoptoFolder(url: string): Promise<PanoptoVideo[]> {
  const { folderId, baseDomain } = extractPanoptoInfo(url);

  if (!folderId) {
    throw new Error(
      "Could not extract folder ID from URL. Make sure it's a Panopto folder URL.",
    );
  }
  if (!baseDomain) {
    throw new Error('Invalid Panopto URL.');
  }

  try {
    const result = await fetchViaProxy(url);
    return parsePanoptoFolderHtml(result.text, baseDomain);
  } catch {
    throw new Error(
      'Failed to fetch Panopto folder. The folder may be private or require authentication.',
    );
  }
}

/**
 * Parses a locally saved Panopto HTML file to extract videos.
 *
 * Uses `<tr>` row patterns with `aria-label` attributes as the primary
 * strategy, falling back to direct Viewer.aspx link extraction.
 *
 * @throws {Error} When the base domain cannot be detected or no videos
 *   are found.
 */
export function parsePanoptoHtmlFile(html: string): PanoptoVideo[] {
  const videos: PanoptoVideo[] = [];
  const seenIds = new Set<string>();

  // Extract base URL from the HTML
  const baseMatch = html.match(
    /href="(https:\/\/[^/]+)\/Panopto\/Pages\/Viewer\.aspx/,
  );
  const baseUrl = baseMatch?.[1] ?? '';

  if (!baseUrl) {
    throw new Error('Could not detect Panopto domain from the HTML file.');
  }

  // Primary: table row pattern with id=UUID and aria-label="Title"
  const rowPattern =
    /<tr\s+id="([a-f0-9-]{36})"[^>]*aria-label="([^"]+)"/gi;

  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(html)) !== null) {
    const id = match[1];
    const title = decodeHtmlEntities(match[2]?.trim() ?? '');

    if (id && title && !seenIds.has(id)) {
      seenIds.add(id);
      videos.push({
        title,
        url: `${baseUrl}/Panopto/Pages/Viewer.aspx?id=${id}`,
      });
    }
  }

  // Fallback: direct viewer links
  if (videos.length === 0) {
    const linkPattern =
      /href="([^"]*\/Panopto\/Pages\/Viewer\.aspx\?id=([a-f0-9-]{36})[^"]*)"/gi;
    const foundIds = new Map<string, string>();

    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkPattern.exec(html)) !== null) {
      const fullUrl = linkMatch[1] ?? '';
      const id = linkMatch[2];
      if (id && !foundIds.has(id)) {
        foundIds.set(id, fullUrl.startsWith('http') ? fullUrl : baseUrl + fullUrl);
      }
    }

    let index = 0;
    for (const [id, videoUrl] of foundIds) {
      index++;
      // Look for aria-label near this ID
      const titlePattern = new RegExp(
        `id=["']?${id}["']?[^>]*aria-label="([^"]+)"`,
        'i',
      );
      const titleMatch = html.match(titlePattern);

      const title = titleMatch?.[1]
        ? decodeHtmlEntities(titleMatch[1].trim())
        : `Video ${String(index)}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        videos.push({ title, url: videoUrl });
      }
    }
  }

  if (videos.length === 0) {
    throw new Error(
      'No Panopto videos found in the HTML file. Make sure you saved the complete page after scrolling to load all videos.',
    );
  }

  return videos;
}
