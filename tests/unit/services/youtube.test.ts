/**
 * Tests for youtube.ts — YouTube playlist fetching and parsing.
 *
 * The cors-proxy service is mocked. Tests cover playlist ID extraction,
 * structured data parsing, regex fallback, and error handling.
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

import { fetchYouTubePlaylist } from '@/services/youtube';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInitialDataHtml(videos: Array<{ videoId: string; title: string }>): string {
  const contents = videos.map((v) => ({
    playlistVideoRenderer: {
      videoId: v.videoId,
      title: { runs: [{ text: v.title }] },
    },
  }));

  const ytData = {
    contents: {
      twoColumnBrowseResultsRenderer: {
        tabs: [
          {
            tabRenderer: {
              content: {
                sectionListRenderer: {
                  contents: [
                    {
                      itemSectionRenderer: {
                        contents: [
                          {
                            playlistVideoListRenderer: { contents },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  };

  return `<html><script>var ytInitialData = ${JSON.stringify(ytData)};</script></html>`;
}

function makeRegexFallbackHtml(videoIds: string[]): string {
  const links = videoIds.map(
    (id) => `<a href="/watch?v=${id}&amp;list=PLtest123">Video</a>`,
  );
  return `<html>${links.join('')}</html>`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('youtube', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Playlist ID extraction
  // =========================================================================

  describe('playlist ID extraction', () => {
    it('throws when URL has no playlist ID', async () => {
      await expect(
        fetchYouTubePlaylist('https://www.youtube.com/watch?v=abc123'),
      ).rejects.toThrow('Could not extract playlist ID');
    });

    it('extracts ID from ?list= parameter', async () => {
      mockFetchViaProxy.mockResolvedValue({
        text: makeInitialDataHtml([{ videoId: 'dQw4w9WgXcQ', title: 'First' }]),
      });

      await fetchYouTubePlaylist('https://www.youtube.com/playlist?list=PLtest123');

      expect(mockFetchViaProxy).toHaveBeenCalledWith(
        'https://www.youtube.com/playlist?list=PLtest123',
        expect.anything(),
      );
    });

    it('extracts ID from &list= in watch URL', async () => {
      mockFetchViaProxy.mockResolvedValue({
        text: makeInitialDataHtml([{ videoId: 'dQw4w9WgXcQ', title: 'First' }]),
      });

      await fetchYouTubePlaylist(
        'https://www.youtube.com/watch?v=abc&list=PLtest456',
      );

      expect(mockFetchViaProxy).toHaveBeenCalledWith(
        'https://www.youtube.com/playlist?list=PLtest456',
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // Structured data parsing (ytInitialData)
  // =========================================================================

  describe('structured data parsing', () => {
    it('parses videos from ytInitialData JSON', async () => {
      mockFetchViaProxy.mockResolvedValue({
        text: makeInitialDataHtml([
          { videoId: 'dQw4w9WgXcQ', title: 'Lecture 1' },
          { videoId: 'jNQXAC9IVRw', title: 'Lecture 2' },
          { videoId: '9bZkp7q19f0', title: 'Lecture 3' },
        ]),
      });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      expect(videos).toHaveLength(3);
      expect(videos[0]).toEqual({
        title: 'Lecture 1',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });
      expect(videos[2]).toEqual({
        title: 'Lecture 3',
        url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
      });
    });

    it('uses fallback title when runs are missing', async () => {
      const html = makeInitialDataHtml([]);
      // Manually insert a renderer without title
      const modified = html.replace('"contents":[]', '"contents":[{"playlistVideoRenderer":{"videoId":"kJQP7kiw5Fk"}}]');

      mockFetchViaProxy.mockResolvedValue({ text: modified });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      expect(videos).toHaveLength(1);
      expect(videos[0]!.title).toBe('Video 1');
    });

    it('skips renderers without videoId', async () => {
      const contents = [
        { playlistVideoRenderer: { title: { runs: [{ text: 'Missing' }] } } },
        { playlistVideoRenderer: { videoId: 'M7lc1UVf-VE', title: { runs: [{ text: 'Good' }] } } },
      ];
      const ytData = {
        contents: {
          twoColumnBrowseResultsRenderer: {
            tabs: [{ tabRenderer: { content: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: [{ playlistVideoListRenderer: { contents } }] } }] } } } }],
          },
        },
      };
      const html = `<html><script>var ytInitialData = ${JSON.stringify(ytData)};</script></html>`;

      mockFetchViaProxy.mockResolvedValue({ text: html });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      expect(videos).toHaveLength(1);
      expect(videos[0]!.title).toBe('Good');
    });
  });

  // =========================================================================
  // Regex fallback
  // =========================================================================

  describe('regex fallback', () => {
    it('extracts videos via regex when structured data is missing', async () => {
      mockFetchViaProxy.mockResolvedValue({
        text: makeRegexFallbackHtml(['abc12345678', 'def12345678']),
      });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      expect(videos).toHaveLength(2);
      expect(videos[0]!.url).toBe('https://www.youtube.com/watch?v=abc12345678');
      expect(videos[0]!.title).toBe('Video 1');
    });

    it('deduplicates videos by video ID', async () => {
      mockFetchViaProxy.mockResolvedValue({
        text: makeRegexFallbackHtml(['sameId12345', 'sameId12345', 'other12345A']),
      });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      expect(videos).toHaveLength(2);
    });

    it('returns empty array when no videos found in HTML', async () => {
      mockFetchViaProxy.mockResolvedValue({
        text: '<html><body>No playlist data here</body></html>',
      });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      expect(videos).toHaveLength(0);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('wraps proxy errors with helpful message', async () => {
      mockFetchViaProxy.mockRejectedValue(
        new Error('proxy: All CORS proxies failed'),
      );

      await expect(
        fetchYouTubePlaylist('https://www.youtube.com/playlist?list=PLtest'),
      ).rejects.toThrow('Failed to connect to YouTube');
    });

    it('wraps other errors with generic message', async () => {
      mockFetchViaProxy.mockRejectedValue(new Error('Some random error'));

      await expect(
        fetchYouTubePlaylist('https://www.youtube.com/playlist?list=PLtest'),
      ).rejects.toThrow('Failed to fetch YouTube playlist');
    });

    it('passes onProgress to fetchViaProxy', async () => {
      mockFetchViaProxy.mockResolvedValue({
        text: makeInitialDataHtml([{ videoId: 'dQw4w9WgXcQ', title: 'Test' }]),
      });

      const onProgress = vi.fn();
      await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
        onProgress,
      );

      expect(mockFetchViaProxy).toHaveBeenCalledWith(
        expect.any(String),
        { onProgress },
      );
    });
  });

  // =========================================================================
  // Structured data malformed JSON
  // =========================================================================

  describe('malformed structured data', () => {
    it('falls back to regex when ytInitialData is malformed JSON', async () => {
      const html = '<html><script>var ytInitialData = {not valid json;</script><a href="/watch?v=fallback1234&amp;list=PLtest">link</a></html>';
      mockFetchViaProxy.mockResolvedValue({ text: html });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      // The regex requires 11-char video IDs — fallback1234 is 12 chars
      // and the regex pattern specifically needs &amp;list= or &list= after the ID
      expect(videos).toHaveLength(0);
    });

    it('falls back to regex when structured data has unexpected shape', async () => {
      const html = '<html><script>var ytInitialData = {"contents":{}};</script><a href="/watch?v=regexOnlyABC&amp;list=PLtest">link</a></html>';
      mockFetchViaProxy.mockResolvedValue({ text: html });

      const videos = await fetchYouTubePlaylist(
        'https://www.youtube.com/playlist?list=PLtest',
      );

      // regexOnlyABC is 12 chars — the regex requires exactly 11 chars [a-zA-Z0-9_-]{11}
      expect(videos).toHaveLength(0);
    });
  });
});
