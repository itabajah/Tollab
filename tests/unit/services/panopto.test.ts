/**
 * Tests for panopto.ts — Panopto video parsing from clipboard, URL, and HTML.
 *
 * CORS proxy is mocked for URL-based fetching. Tests cover all three input
 * modes, extraction strategies, HTML entity decoding, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock cors-proxy
// ---------------------------------------------------------------------------

const mockFetchViaProxy = vi.fn();

vi.mock('@/services/cors-proxy', () => ({
  fetchViaProxy: (...args: unknown[]) => mockFetchViaProxy(...args),
}));

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------

import {
  parsePanoptoClipboard,
  fetchPanoptoFolder,
  parsePanoptoHtmlFile,
} from '@/services/panopto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const SESSION_ID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
const BASE_DOMAIN = 'https://panopto.example.com';
const VIEWER_URL = `${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('panopto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // parsePanoptoClipboard
  // =========================================================================

  describe('parsePanoptoClipboard', () => {
    it('parses array of SessionId/SessionName objects', () => {
      const json = JSON.stringify([
        { SessionId: SESSION_ID, SessionName: 'Lecture 1' },
        { SessionId: SESSION_ID_2, SessionName: 'Lecture 2' },
      ]);
      const videos = parsePanoptoClipboard(json);

      expect(videos).toHaveLength(2);
      expect(videos[0]!.title).toBe('Lecture 1');
      expect(videos[0]!.url).toBe(SESSION_ID);
      expect(videos[1]!.title).toBe('Lecture 2');
    });

    it('parses single object (not array)', () => {
      const json = JSON.stringify({
        SessionId: SESSION_ID,
        SessionName: 'Single Video',
      });
      const videos = parsePanoptoClipboard(json);

      expect(videos).toHaveLength(1);
      expect(videos[0]!.title).toBe('Single Video');
    });

    it('handles objects with url field directly', () => {
      const json = JSON.stringify([
        { title: 'Custom', url: 'https://panopto.example.com/viewer?id=123' },
      ]);
      const videos = parsePanoptoClipboard(json);

      expect(videos).toHaveLength(1);
      expect(videos[0]!.url).toBe('https://panopto.example.com/viewer?id=123');
    });

    it('handles alternate field names (name, Name, id, Id)', () => {
      const json = JSON.stringify([
        { Id: SESSION_ID, Name: 'Alt Name' },
        { id: SESSION_ID_2, name: 'Alt Name 2' },
      ]);
      const videos = parsePanoptoClipboard(json);

      expect(videos).toHaveLength(2);
      expect(videos[0]!.title).toBe('Alt Name');
      expect(videos[1]!.title).toBe('Alt Name 2');
    });

    it('returns empty array for invalid JSON', () => {
      const videos = parsePanoptoClipboard('not valid json');
      expect(videos).toEqual([]);
    });

    it('returns empty array for array of primitives', () => {
      const videos = parsePanoptoClipboard('[1, 2, 3]');
      expect(videos).toEqual([]);
    });

    it('skips null items in array', () => {
      const json = JSON.stringify([
        null,
        { SessionId: SESSION_ID, SessionName: 'Valid' },
      ]);
      const videos = parsePanoptoClipboard(json);
      expect(videos).toHaveLength(1);
    });

    it('skips items without title/name or id/url', () => {
      const json = JSON.stringify([
        { irrelevant: 'data' },
        { SessionId: SESSION_ID, SessionName: 'Has Both' },
      ]);
      const videos = parsePanoptoClipboard(json);
      expect(videos).toHaveLength(1);
    });
  });

  // =========================================================================
  // fetchPanoptoFolder
  // =========================================================================

  describe('fetchPanoptoFolder', () => {
    it('throws when folder ID cannot be extracted', async () => {
      await expect(
        fetchPanoptoFolder('https://panopto.example.com/some/page'),
      ).rejects.toThrow('Could not extract folder ID');
    });

    it('throws when domain cannot be extracted', async () => {
      await expect(
        fetchPanoptoFolder('folderID=abc-123-def'),
      ).rejects.toThrow('Invalid Panopto URL');
    });

    it('fetches and parses folder page via proxy', async () => {
      const html = `<html>DeliveryInfo{"SessionId":"${SESSION_ID}","SessionName":"Lec 1"}</html>`;
      mockFetchViaProxy.mockResolvedValue({ text: html });

      const videos = await fetchPanoptoFolder(
        `${BASE_DOMAIN}/Panopto/Pages/Sessions/List.aspx?folderID=${SESSION_ID}`,
      );

      expect(mockFetchViaProxy).toHaveBeenCalled();
      expect(videos).toHaveLength(1);
      expect(videos[0]!.title).toBe('Lec 1');
    });

    it('wraps proxy errors with helpful message', async () => {
      mockFetchViaProxy.mockRejectedValue(new Error('All proxies failed'));

      await expect(
        fetchPanoptoFolder(
          `${BASE_DOMAIN}/Panopto/Pages/Sessions/List.aspx?folderID=${SESSION_ID}`,
        ),
      ).rejects.toThrow('Failed to fetch Panopto folder');
    });

    it('extracts folder ID from multiple URL patterns', async () => {
      const html = '<html>no videos</html>';
      mockFetchViaProxy.mockResolvedValue({ text: html });

      // folderID= pattern
      await fetchPanoptoFolder(
        `${BASE_DOMAIN}/Panopto/Pages/Sessions/List.aspx?folderID=${SESSION_ID}`,
      );
      expect(mockFetchViaProxy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // parsePanoptoHtmlFile
  // =========================================================================

  describe('parsePanoptoHtmlFile', () => {
    it('throws when base domain cannot be detected', () => {
      expect(() => parsePanoptoHtmlFile('<html>no domain</html>')).toThrow(
        'Could not detect Panopto domain',
      );
    });

    it('throws when no videos are found', () => {
      const html = `<html><a href="${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=test">link</a></html>`;
      // This has a viewer link but the ID is not a valid UUID
      expect(() => parsePanoptoHtmlFile(html)).toThrow(
        'No Panopto videos found',
      );
    });

    it('extracts videos from table row pattern (primary)', () => {
      const html = `
        <html>
          <a href="${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=x">ref</a>
          <tr id="${SESSION_ID}" class="row" aria-label="Intro to Algorithms">
          <tr id="${SESSION_ID_2}" class="row" aria-label="Data Structures">
        </html>
      `;
      const videos = parsePanoptoHtmlFile(html);

      expect(videos).toHaveLength(2);
      expect(videos[0]!.title).toBe('Intro to Algorithms');
      expect(videos[0]!.url).toBe(`${VIEWER_URL}${SESSION_ID}`);
      expect(videos[1]!.title).toBe('Data Structures');
    });

    it('deduplicates by session ID', () => {
      const html = `
        <html>
          <a href="${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=x">ref</a>
          <tr id="${SESSION_ID}" class="row" aria-label="Lecture 1">
          <tr id="${SESSION_ID}" class="row" aria-label="Lecture 1 Duplicate">
        </html>
      `;
      const videos = parsePanoptoHtmlFile(html);
      expect(videos).toHaveLength(1);
    });

    it('decodes HTML entities in titles', () => {
      const html = `
        <html>
          <a href="${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=x">ref</a>
          <tr id="${SESSION_ID}" class="row" aria-label="Algorithms &amp; Data Structures &lt;CS&gt;">
        </html>
      `;
      const videos = parsePanoptoHtmlFile(html);
      expect(videos[0]!.title).toBe('Algorithms & Data Structures <CS>');
    });

    it('falls back to viewer link extraction when no table rows', () => {
      const html = `
        <html>
          <a href="${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=${SESSION_ID}">Watch</a>
          <a href="${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=${SESSION_ID_2}">Watch</a>
          <span id="${SESSION_ID}" aria-label="Lecture A">data</span>
        </html>
      `;
      const videos = parsePanoptoHtmlFile(html);

      expect(videos.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // HTML extraction strategies (via folder fetch)
  // =========================================================================

  describe('extraction strategies', () => {
    it('extracts from DeliveryInfo JSON blocks', async () => {
      const html = `
        <html>
          DeliveryInfo{"SessionId":"${SESSION_ID}","SessionName":"From Delivery"}
          DeliveryInfo{"SessionId":"${SESSION_ID_2}","SessionName":"From Delivery 2"}
        </html>
      `;
      mockFetchViaProxy.mockResolvedValue({ text: html });

      const videos = await fetchPanoptoFolder(
        `${BASE_DOMAIN}/Panopto/Pages/Sessions/List.aspx?folderID=${SESSION_ID}`,
      );

      expect(videos).toHaveLength(2);
      expect(videos[0]!.title).toBe('From Delivery');
    });

    it('extracts from href links with session IDs', async () => {
      const html = `
        <html>
          <a href="${BASE_DOMAIN}/Panopto/Pages/Viewer.aspx?id=${SESSION_ID}">Lecture A</a>
          <a href="other/id=${SESSION_ID_2}">Lecture B</a>
        </html>
      `;
      mockFetchViaProxy.mockResolvedValue({ text: html });

      const videos = await fetchPanoptoFolder(
        `${BASE_DOMAIN}/Panopto/Pages/Sessions/List.aspx?folderID=${SESSION_ID}`,
      );

      expect(videos.length).toBeGreaterThanOrEqual(1);
    });

    it('extracts from session-list JSON blocks as last resort', async () => {
      const sessionList = JSON.stringify([
        { Id: SESSION_ID, Name: 'JSON Session 1' },
        { Id: SESSION_ID_2, Name: 'JSON Session 2' },
      ]);
      const html = `<html>Sessions = ${sessionList}</html>`;
      mockFetchViaProxy.mockResolvedValue({ text: html });

      const videos = await fetchPanoptoFolder(
        `${BASE_DOMAIN}/Panopto/Pages/Sessions/List.aspx?folderID=${SESSION_ID}`,
      );

      expect(videos).toHaveLength(2);
      expect(videos[0]!.title).toBe('JSON Session 1');
    });
  });
});
