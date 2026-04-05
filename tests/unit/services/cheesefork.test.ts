/**
 * Tests for cheesefork.ts — Cheesefork ICS import service.
 *
 * CORS proxy and ICS parser are mocked. Tests cover JSON metadata parsing,
 * ICS fallback, semester name translation, batch import, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchViaProxy = vi.fn();
const mockParseICS = vi.fn();

vi.mock('@/services/cors-proxy', () => ({
  fetchViaProxy: (...args: unknown[]) => mockFetchViaProxy(...args),
}));

vi.mock('@/utils/ics-parser', () => ({
  parseICS: (...args: unknown[]) => mockParseICS(...args),
}));

vi.mock('@/constants/semesters', () => ({
  SEMESTER_TRANSLATIONS: {
    'אביב': 'Spring',
    'חורף': 'Winter',
    'קיץ': 'Summer',
  },
}));

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------

import {
  fetchICSData,
  parseICSToSemesters,
  batchImportSemesters,
} from '@/services/cheesefork';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cheesefork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // fetchICSData — JSON mode
  // =========================================================================

  describe('fetchICSData — JSON mode', () => {
    it('fetches JSON version first and parses courses array', async () => {
      const courses = [
        { summary: 'CS101', description: 'Intro' },
        { summary: 'CS201', description: 'Algorithms' },
      ];
      mockFetchViaProxy.mockResolvedValueOnce({
        text: JSON.stringify(courses),
      });

      const result = await fetchICSData('https://cheesefork.cf/winter-2024-2025.ics');

      expect(mockFetchViaProxy).toHaveBeenCalledWith(
        'https://cheesefork.cf/winter-2024-2025.json',
      );
      expect(result.courses).toHaveLength(2);
      expect(result.semesterName).toBe('Imported Semester');
    });

    it('extracts semester name from JSON object', async () => {
      mockFetchViaProxy.mockResolvedValueOnce({
        text: JSON.stringify({
          semester: 'חורף 2024-2025',
          courses: [{ summary: 'CS101' }],
        }),
      });

      const result = await fetchICSData('https://cheesefork.cf/test.ics');

      expect(result.semesterName).toBe('Winter 2024-2025');
    });

    it('uses semesterNameOverride when provided', async () => {
      mockFetchViaProxy.mockResolvedValueOnce({
        text: JSON.stringify({
          semester: 'חורף 2024-2025',
          courses: [{ summary: 'CS101' }],
        }),
      });

      const result = await fetchICSData(
        'https://cheesefork.cf/test.ics',
        'Custom Name',
      );

      expect(result.semesterName).toBe('Custom Name');
    });

    it('extracts courses from nested object with courses key', async () => {
      mockFetchViaProxy.mockResolvedValueOnce({
        text: JSON.stringify({
          courses: [{ summary: 'Math101' }],
          semester: 'אביב 2025',
        }),
      });

      const result = await fetchICSData('https://cheesefork.cf/test.ics');

      expect(result.courses).toHaveLength(1);
      expect(result.semesterName).toBe('Spring 2025');
    });
  });

  // =========================================================================
  // fetchICSData — ICS fallback
  // =========================================================================

  describe('fetchICSData — ICS fallback', () => {
    it('falls back to ICS when JSON fetch fails', async () => {
      mockFetchViaProxy
        .mockRejectedValueOnce(new Error('JSON not found'))
        .mockResolvedValueOnce({ text: 'BEGIN:VCALENDAR\nEND:VCALENDAR' });

      mockParseICS.mockReturnValue([{ summary: 'Fallback Course' }]);

      const result = await fetchICSData(
        'https://cheesefork.cf/winter-2024-2025.ics',
      );

      expect(result.courses).toHaveLength(1);
      expect(result.semesterName).toBe('Winter 2024-2025');
    });

    it('falls back to ICS when JSON has empty courses', async () => {
      mockFetchViaProxy
        .mockResolvedValueOnce({ text: JSON.stringify({ courses: [] }) })
        .mockResolvedValueOnce({ text: 'ICS content' });

      mockParseICS.mockReturnValue([{ summary: 'ICS Course' }]);

      const result = await fetchICSData('https://cheesefork.cf/spring-2025.ics');

      expect(result.courses).toHaveLength(1);
      expect(result.semesterName).toBe('Spring 2025');
    });

    it('throws when ICS fetch returns empty text', async () => {
      mockFetchViaProxy
        .mockRejectedValueOnce(new Error('JSON not found'))
        .mockResolvedValueOnce({ text: '' });

      await expect(
        fetchICSData('https://cheesefork.cf/test.ics'),
      ).rejects.toThrow('Failed to fetch calendar file');
    });

    it('throws when ICS parsing returns no courses', async () => {
      mockFetchViaProxy
        .mockRejectedValueOnce(new Error('JSON not found'))
        .mockResolvedValueOnce({ text: 'BEGIN:VCALENDAR\nEND:VCALENDAR' });

      mockParseICS.mockReturnValue([]);

      await expect(
        fetchICSData('https://cheesefork.cf/test.ics'),
      ).rejects.toThrow('No courses found');
    });

    it('extracts semester name from URL filename', async () => {
      mockFetchViaProxy
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ text: 'ICS data' });

      mockParseICS.mockReturnValue([{ summary: 'Course' }]);

      const result = await fetchICSData(
        'https://cheesefork.cf/summer-2025.ics',
      );

      expect(result.semesterName).toBe('Summer 2025');
    });
  });

  // =========================================================================
  // parseICSToSemesters
  // =========================================================================

  describe('parseICSToSemesters', () => {
    it('parses raw ICS text into a semester', () => {
      mockParseICS.mockReturnValue([
        { summary: 'Math' },
        { summary: 'Physics' },
      ]);

      const result = parseICSToSemesters('BEGIN:VCALENDAR...', 'Winter 2024');

      expect(result.semesterName).toBe('Winter 2024');
      expect(result.courses).toHaveLength(2);
    });

    it('uses default name when none provided', () => {
      mockParseICS.mockReturnValue([{ summary: 'CS' }]);

      const result = parseICSToSemesters('ICS data');

      expect(result.semesterName).toBe('Imported Semester');
    });

    it('translates Hebrew semester name', () => {
      mockParseICS.mockReturnValue([{ summary: 'CS' }]);

      const result = parseICSToSemesters('ICS data', 'קיץ 2025');

      expect(result.semesterName).toBe('Summer 2025');
    });

    it('throws when no courses found', () => {
      mockParseICS.mockReturnValue([]);

      expect(() => parseICSToSemesters('empty ICS')).toThrow(
        'No courses found',
      );
    });
  });

  // =========================================================================
  // batchImportSemesters
  // =========================================================================

  describe('batchImportSemesters', () => {
    it('returns results for each URL', async () => {
      // First URL: success
      mockFetchViaProxy
        .mockResolvedValueOnce({
          text: JSON.stringify([{ summary: 'C1' }]),
        })
        // Second URL: JSON fails, ICS works
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ text: 'ICS data' });

      mockParseICS.mockReturnValue([{ summary: 'C2' }]);

      const results = await batchImportSemesters([
        'https://cheesefork.cf/winter-2024-2025.ics',
        'https://cheesefork.cf/spring-2025.ics',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]!.success).toBe(true);
      expect(results[0]!.count).toBe(1);
      expect(results[1]!.success).toBe(true);
    });

    it('captures individual errors without failing the batch', async () => {
      mockFetchViaProxy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          text: JSON.stringify([{ summary: 'C1' }]),
        });

      const results = await batchImportSemesters([
        'https://cheesefork.cf/bad.ics',
        'https://cheesefork.cf/good.ics',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]!.success).toBe(false);
      expect(results[0]!.error).toBeTruthy();
      expect(results[1]!.success).toBe(true);
    });

    it('handles empty URL list', async () => {
      const results = await batchImportSemesters([]);
      expect(results).toEqual([]);
    });

    it('includes url in each result', async () => {
      mockFetchViaProxy.mockResolvedValueOnce({
        text: JSON.stringify([{ summary: 'C1' }]),
      });

      const results = await batchImportSemesters([
        'https://cheesefork.cf/test.ics',
      ]);

      expect(results[0]!.url).toBe('https://cheesefork.cf/test.ics');
    });
  });
});
