/**
 * Tests for validation constants — validates limits are sensible,
 * patterns match expected inputs, and HTML entities are complete.
 */

import { describe, it, expect } from 'vitest';
import {
  VALIDATION_LIMITS,
  VALIDATION_PATTERNS,
  HTML_ENTITIES,
} from '@/constants/validation';

describe('validation constants', () => {
  // =========================================================================
  // VALIDATION_LIMITS
  // =========================================================================

  describe('VALIDATION_LIMITS', () => {
    it('has all expected keys', () => {
      const keys = Object.keys(VALIDATION_LIMITS);
      expect(keys).toContain('COURSE_NAME_MAX');
      expect(keys).toContain('HOMEWORK_TITLE_MAX');
      expect(keys).toContain('NOTES_MAX');
      expect(keys).toContain('URL_MAX');
      expect(keys).toContain('PROFILE_NAME_MAX');
      expect(keys).toContain('SEMESTER_NAME_MAX');
      expect(keys).toContain('MIN_YEAR');
      expect(keys).toContain('MAX_YEAR');
    });

    it('all values are positive numbers', () => {
      for (const value of Object.values(VALIDATION_LIMITS)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      }
    });

    it('COURSE_NAME_MAX is reasonable (10-500)', () => {
      expect(VALIDATION_LIMITS.COURSE_NAME_MAX).toBeGreaterThanOrEqual(10);
      expect(VALIDATION_LIMITS.COURSE_NAME_MAX).toBeLessThanOrEqual(500);
    });

    it('HOMEWORK_TITLE_MAX is reasonable (10-1000)', () => {
      expect(VALIDATION_LIMITS.HOMEWORK_TITLE_MAX).toBeGreaterThanOrEqual(10);
      expect(VALIDATION_LIMITS.HOMEWORK_TITLE_MAX).toBeLessThanOrEqual(1000);
    });

    it('NOTES_MAX is generous enough for long notes', () => {
      expect(VALIDATION_LIMITS.NOTES_MAX).toBeGreaterThanOrEqual(1000);
    });

    it('URL_MAX aligns with browser limits', () => {
      expect(VALIDATION_LIMITS.URL_MAX).toBe(2048);
    });

    it('PROFILE_NAME_MAX is reasonable', () => {
      expect(VALIDATION_LIMITS.PROFILE_NAME_MAX).toBeGreaterThanOrEqual(10);
      expect(VALIDATION_LIMITS.PROFILE_NAME_MAX).toBeLessThanOrEqual(200);
    });

    it('SEMESTER_NAME_MAX is reasonable', () => {
      expect(VALIDATION_LIMITS.SEMESTER_NAME_MAX).toBeGreaterThanOrEqual(10);
      expect(VALIDATION_LIMITS.SEMESTER_NAME_MAX).toBeLessThanOrEqual(200);
    });

    it('year range covers reasonable academic years', () => {
      expect(VALIDATION_LIMITS.MIN_YEAR).toBeLessThanOrEqual(2000);
      expect(VALIDATION_LIMITS.MAX_YEAR).toBeGreaterThanOrEqual(2050);
      expect(VALIDATION_LIMITS.MAX_YEAR).toBeGreaterThan(VALIDATION_LIMITS.MIN_YEAR);
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(VALIDATION_LIMITS)).toBe(true);
    });
  });

  // =========================================================================
  // VALIDATION_PATTERNS
  // =========================================================================

  describe('VALIDATION_PATTERNS', () => {
    it('has all expected pattern keys', () => {
      const keys = Object.keys(VALIDATION_PATTERNS);
      expect(keys).toContain('URL');
      expect(keys).toContain('YOUTUBE_URL');
      expect(keys).toContain('PANOPTO_URL');
      expect(keys).toContain('COURSE_NUMBER');
      expect(keys).toContain('TIME_FORMAT');
      expect(keys).toContain('DATE_FORMAT');
      expect(keys).toContain('SAFE_FILENAME');
      expect(keys).toContain('UUID');
    });

    it('all values are RegExp instances', () => {
      for (const value of Object.values(VALIDATION_PATTERNS)) {
        expect(value).toBeInstanceOf(RegExp);
      }
    });

    describe('URL pattern', () => {
      it('matches valid http URLs', () => {
        expect(VALIDATION_PATTERNS.URL.test('http://example.com')).toBe(true);
      });

      it('matches valid https URLs', () => {
        expect(VALIDATION_PATTERNS.URL.test('https://example.com/path?q=1')).toBe(true);
      });

      it('rejects ftp URLs', () => {
        expect(VALIDATION_PATTERNS.URL.test('ftp://files.example.com')).toBe(false);
      });

      it('rejects plain text', () => {
        expect(VALIDATION_PATTERNS.URL.test('not a url')).toBe(false);
      });

      it('rejects empty string', () => {
        expect(VALIDATION_PATTERNS.URL.test('')).toBe(false);
      });
    });

    describe('YOUTUBE_URL pattern', () => {
      it('matches youtube.com URLs', () => {
        expect(VALIDATION_PATTERNS.YOUTUBE_URL.test('https://www.youtube.com/watch?v=abc')).toBe(true);
      });

      it('matches youtu.be URLs', () => {
        expect(VALIDATION_PATTERNS.YOUTUBE_URL.test('https://youtu.be/abc123')).toBe(true);
      });

      it('rejects non-youtube URLs', () => {
        expect(VALIDATION_PATTERNS.YOUTUBE_URL.test('https://vimeo.com/123')).toBe(false);
      });

      it('matches without www', () => {
        expect(VALIDATION_PATTERNS.YOUTUBE_URL.test('https://youtube.com/watch?v=abc')).toBe(true);
      });
    });

    describe('PANOPTO_URL pattern', () => {
      it('matches URLs containing panopto', () => {
        expect(VALIDATION_PATTERNS.PANOPTO_URL.test('https://technion.cloud.panopto.eu/folder/123')).toBe(true);
      });

      it('is case insensitive', () => {
        expect(VALIDATION_PATTERNS.PANOPTO_URL.test('https://PANOPTO.eu/vid')).toBe(true);
      });

      it('rejects non-panopto URLs', () => {
        expect(VALIDATION_PATTERNS.PANOPTO_URL.test('https://youtube.com/watch')).toBe(false);
      });
    });

    describe('COURSE_NUMBER pattern', () => {
      it('matches typical course numbers', () => {
        expect(VALIDATION_PATTERNS.COURSE_NUMBER.test('234111')).toBe(true);
      });

      it('matches alphanumeric with hyphens', () => {
        expect(VALIDATION_PATTERNS.COURSE_NUMBER.test('CS-101')).toBe(true);
      });

      it('matches with dots and underscores', () => {
        expect(VALIDATION_PATTERNS.COURSE_NUMBER.test('CS_101.A')).toBe(true);
      });

      it('matches empty string', () => {
        expect(VALIDATION_PATTERNS.COURSE_NUMBER.test('')).toBe(true);
      });

      it('rejects strings longer than 20 characters', () => {
        expect(VALIDATION_PATTERNS.COURSE_NUMBER.test('A'.repeat(21))).toBe(false);
      });

      it('rejects special characters', () => {
        expect(VALIDATION_PATTERNS.COURSE_NUMBER.test('CS@101')).toBe(false);
      });
    });

    describe('TIME_FORMAT pattern', () => {
      it('matches valid times', () => {
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('08:30')).toBe(true);
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('23:59')).toBe(true);
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('0:00')).toBe(true);
      });

      it('rejects invalid hours', () => {
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('24:00')).toBe(false);
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('25:00')).toBe(false);
      });

      it('rejects invalid minutes', () => {
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('08:60')).toBe(false);
      });

      it('rejects non-time strings', () => {
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('abc')).toBe(false);
        expect(VALIDATION_PATTERNS.TIME_FORMAT.test('')).toBe(false);
      });
    });

    describe('DATE_FORMAT pattern', () => {
      it('matches YYYY-MM-DD format', () => {
        expect(VALIDATION_PATTERNS.DATE_FORMAT.test('2024-01-15')).toBe(true);
      });

      it('rejects DD/MM/YYYY format', () => {
        expect(VALIDATION_PATTERNS.DATE_FORMAT.test('15/01/2024')).toBe(false);
      });

      it('rejects empty string', () => {
        expect(VALIDATION_PATTERNS.DATE_FORMAT.test('')).toBe(false);
      });
    });

    describe('UUID pattern', () => {
      it('matches standard UUIDs', () => {
        expect(VALIDATION_PATTERNS.UUID.test('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
      });

      it('is case insensitive', () => {
        expect(VALIDATION_PATTERNS.UUID.test('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(true);
      });

      it('rejects malformed UUIDs', () => {
        expect(VALIDATION_PATTERNS.UUID.test('not-a-uuid')).toBe(false);
        expect(VALIDATION_PATTERNS.UUID.test('')).toBe(false);
      });
    });

    describe('SAFE_FILENAME pattern', () => {
      it('matches safe filenames', () => {
        expect(VALIDATION_PATTERNS.SAFE_FILENAME.test('my-file_v2.txt')).toBe(true);
      });

      it('rejects path traversal characters', () => {
        expect(VALIDATION_PATTERNS.SAFE_FILENAME.test('../etc/passwd')).toBe(false);
      });

      it('rejects empty string', () => {
        expect(VALIDATION_PATTERNS.SAFE_FILENAME.test('')).toBe(false);
      });
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(VALIDATION_PATTERNS)).toBe(true);
    });
  });

  // =========================================================================
  // HTML_ENTITIES
  // =========================================================================

  describe('HTML_ENTITIES', () => {
    it('covers the 5 critical XSS characters', () => {
      expect(HTML_ENTITIES).toHaveProperty('&');
      expect(HTML_ENTITIES).toHaveProperty('<');
      expect(HTML_ENTITIES).toHaveProperty('>');
      expect(HTML_ENTITIES).toHaveProperty('"');
      expect(HTML_ENTITIES).toHaveProperty("'");
    });

    it('has exactly 5 entries', () => {
      expect(Object.keys(HTML_ENTITIES)).toHaveLength(5);
    });

    it('maps to correct HTML entities', () => {
      expect(HTML_ENTITIES['&']).toBe('&amp;');
      expect(HTML_ENTITIES['<']).toBe('&lt;');
      expect(HTML_ENTITIES['>']).toBe('&gt;');
      expect(HTML_ENTITIES['"']).toBe('&quot;');
      expect(HTML_ENTITIES["'"]).toBe('&#039;');
    });

    it('all values are non-empty strings', () => {
      for (const value of Object.values(HTML_ENTITIES)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    it('is frozen (immutable)', () => {
      expect(Object.isFrozen(HTML_ENTITIES)).toBe(true);
    });
  });
});
