import { describe, it, expect } from 'vitest';
import {
  detectVideoPlatform,
  getVideoEmbedInfo,
  supportsInlinePreview,
} from '@/utils/video';

describe('detectVideoPlatform', () => {
  it('detects YouTube from youtube.com', () => {
    expect(detectVideoPlatform('https://www.youtube.com/watch?v=abc123')).toBe('youtube');
  });

  it('detects YouTube from youtu.be', () => {
    expect(detectVideoPlatform('https://youtu.be/abc123')).toBe('youtube');
  });

  it('detects Panopto', () => {
    expect(detectVideoPlatform('https://technion.panopto.com/viewer?id=123')).toBe('panopto');
  });

  it('returns unknown for other URLs', () => {
    expect(detectVideoPlatform('https://vimeo.com/123')).toBe('unknown');
  });

  it('returns unknown for empty string', () => {
    expect(detectVideoPlatform('')).toBe('unknown');
  });

  it('returns unknown for null', () => {
    expect(detectVideoPlatform(null as unknown as string)).toBe('unknown');
  });

  it('returns unknown for undefined', () => {
    expect(detectVideoPlatform(undefined as unknown as string)).toBe('unknown');
  });
});

describe('getVideoEmbedInfo', () => {
  it('returns embed URL for youtube.com watch link', () => {
    const info = getVideoEmbedInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(info.platform).toBe('youtube');
    expect(info.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('returns embed URL for youtu.be short link', () => {
    const info = getVideoEmbedInfo('https://youtu.be/dQw4w9WgXcQ');
    expect(info.platform).toBe('youtube');
    expect(info.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('returns embed URL for Panopto link', () => {
    const info = getVideoEmbedInfo(
      'https://technion.panopto.com/Panopto/Pages/Viewer.aspx?id=12345678-abcd-1234-abcd-123456789012',
    );
    expect(info.platform).toBe('panopto');
    expect(info.embedUrl).toContain('Embed.aspx');
    expect(info.embedUrl).toContain('12345678-abcd-1234-abcd-123456789012');
  });

  it('returns null embedUrl for unsupported platform', () => {
    const info = getVideoEmbedInfo('https://vimeo.com/123456');
    expect(info.platform).toBe('unknown');
    expect(info.embedUrl).toBeNull();
  });

  it('returns null embedUrl for empty string', () => {
    const info = getVideoEmbedInfo('');
    expect(info.embedUrl).toBeNull();
    expect(info.platform).toBe('unknown');
  });

  it('returns null embedUrl for null input', () => {
    const info = getVideoEmbedInfo(null as unknown as string);
    expect(info.embedUrl).toBeNull();
  });

  it('returns null embedUrl for malformed YouTube URL', () => {
    const info = getVideoEmbedInfo('https://youtube.com/');
    expect(info.embedUrl).toBeNull();
  });
});

describe('supportsInlinePreview', () => {
  it('returns true for YouTube URL', () => {
    expect(supportsInlinePreview('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('returns true for Panopto URL with valid ID', () => {
    expect(
      supportsInlinePreview(
        'https://technion.panopto.com/Panopto/Pages/Viewer.aspx?id=12345678-abcd-1234-abcd-123456789012',
      ),
    ).toBe(true);
  });

  it('returns false for unsupported URL', () => {
    expect(supportsInlinePreview('https://vimeo.com/123')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(supportsInlinePreview('')).toBe(false);
  });

  it('returns false for null', () => {
    expect(supportsInlinePreview(null as unknown as string)).toBe(false);
  });
});
