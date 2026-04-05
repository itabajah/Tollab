/**
 * Tests for useImportExport hook — ICS import (single + batch),
 * Technion catalog fetch, loading states, error handling.
 *
 * Also tests the exported generateBatchUrls helper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockImportSemester = vi.fn();
const mockUpdateCourse = vi.fn();
const mockFetchICSData = vi.fn();
const mockFetchSemesterList = vi.fn();
const mockBuildCourseCatalog = vi.fn();
const mockEnrichCoursesWithCatalog = vi.fn();

let mockSemesters: { id: string; name: string; courses: { id: string; name: string; number: string; points: string; lecturer: string; faculty: string; syllabus: string }[]; calendarSettings: object }[] = [];
let mockCurrentSemesterId: string | null = null;

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => {
    const state = {
      importSemester: mockImportSemester,
      semesters: mockSemesters,
      currentSemesterId: mockCurrentSemesterId,
      updateCourse: mockUpdateCourse,
    };
    return selector(state);
  },
}));

vi.mock('@/services/cheesefork', () => ({
  fetchICSData: (...args: unknown[]) => mockFetchICSData(...args),
}));

vi.mock('@/services/technion-catalog', () => ({
  fetchSemesterList: (...args: unknown[]) => mockFetchSemesterList(...args),
  buildCourseCatalog: (...args: unknown[]) => mockBuildCourseCatalog(...args),
  enrichCoursesWithCatalog: (...args: unknown[]) => mockEnrichCoursesWithCatalog(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useImportExport, generateBatchUrls } from '@/hooks/useImportExport';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParsedCourse(name: string, number = '234111') {
  return {
    name,
    number,
    lecturer: 'Prof. A',
    location: 'Taub 2',
    moedA: '2024-02-01',
    moedB: '2024-03-01',
    schedule: [{ day: 0, start: '08:30', end: '10:30' }],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useImportExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSemesters = [];
    mockCurrentSemesterId = null;
  });

  // =========================================================================
  // Initial state
  // =========================================================================

  describe('initial state', () => {
    it('starts with isImporting=false', () => {
      const { result } = renderHook(() => useImportExport());
      expect(result.current.isImporting).toBe(false);
    });

    it('starts with empty importProgress', () => {
      const { result } = renderHook(() => useImportExport());
      expect(result.current.importProgress).toBe('');
    });

    it('starts with isFetchingCatalog=false', () => {
      const { result } = renderHook(() => useImportExport());
      expect(result.current.isFetchingCatalog).toBe(false);
    });

    it('starts with empty catalogProgress', () => {
      const { result } = renderHook(() => useImportExport());
      expect(result.current.catalogProgress).toBe('');
    });
  });

  // =========================================================================
  // importSingleICS
  // =========================================================================

  describe('importSingleICS', () => {
    it('imports ICS and returns semester info', async () => {
      mockFetchICSData.mockResolvedValue({
        semesterName: 'Winter 2024-2025',
        courses: [makeParsedCourse('Intro CS'), makeParsedCourse('Linear Algebra')],
      });

      const { result } = renderHook(() => useImportExport());
      let importResult: { semesterName: string; count: number } | undefined;

      await act(async () => {
        importResult = await result.current.importSingleICS('https://example.com/winter.ics');
      });

      expect(importResult!.semesterName).toBe('Winter 2024-2025');
      expect(importResult!.count).toBe(2);
      expect(mockImportSemester).toHaveBeenCalledTimes(1);
    });

    it('sets isImporting during operation', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetchICSData.mockReturnValue(
        new Promise((resolve) => { resolvePromise = resolve; }),
      );

      const { result } = renderHook(() => useImportExport());

      // Start import — should be loading
      let importPromise: Promise<unknown>;
      act(() => {
        importPromise = result.current.importSingleICS('https://example.com/test.ics');
      });

      // Resolve the fetch
      await act(async () => {
        resolvePromise!({
          semesterName: 'Test',
          courses: [makeParsedCourse('Course 1')],
        });
        await importPromise!;
      });

      // After completion, should not be importing
      expect(result.current.isImporting).toBe(false);
    });

    it('resets isImporting on error', async () => {
      mockFetchICSData.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useImportExport());

      await expect(
        act(async () => {
          await result.current.importSingleICS('https://bad-url.com');
        }),
      ).rejects.toThrow('Network error');

      expect(result.current.isImporting).toBe(false);
    });

    it('calls importSemester with correct semester structure', async () => {
      mockFetchICSData.mockResolvedValue({
        semesterName: 'Spring 2025',
        courses: [makeParsedCourse('Math')],
      });

      const { result } = renderHook(() => useImportExport());

      await act(async () => {
        await result.current.importSingleICS('https://example.com/spring.ics');
      });

      const calledWith = mockImportSemester.mock.calls[0]![0];
      expect(calledWith).toHaveProperty('id');
      expect(calledWith).toHaveProperty('name', 'Spring 2025');
      expect(calledWith.courses).toHaveLength(1);
      expect(calledWith.courses[0]).toHaveProperty('name', 'Math');
      expect(calledWith).toHaveProperty('calendarSettings');
    });

    it('generates course colors using golden angle distribution', async () => {
      mockFetchICSData.mockResolvedValue({
        semesterName: 'Test',
        courses: [makeParsedCourse('C1'), makeParsedCourse('C2'), makeParsedCourse('C3')],
      });

      const { result } = renderHook(() => useImportExport());

      await act(async () => {
        await result.current.importSingleICS('https://example.com/test.ics');
      });

      const semester = mockImportSemester.mock.calls[0]![0];
      const colors = semester.courses.map((c: { color: string }) => c.color);

      // All colors should be HSL strings
      for (const color of colors) {
        expect(color).toMatch(/^hsl\(/);
      }

      // Colors should be different for different courses
      expect(new Set(colors).size).toBe(colors.length);
    });
  });

  // =========================================================================
  // importBatchICS
  // =========================================================================

  describe('importBatchICS', () => {
    it('imports multiple semesters', async () => {
      // winter 2024 → spring 2024 = 2 semesters
      mockFetchICSData
        .mockResolvedValueOnce({
          semesterName: 'Winter 2024-2025',
          courses: [makeParsedCourse('C1')],
        })
        .mockResolvedValueOnce({
          semesterName: 'Spring 2024',
          courses: [makeParsedCourse('C2')],
        });

      const { result } = renderHook(() => useImportExport());
      let results: unknown[];

      await act(async () => {
        results = await result.current.importBatchICS(
          'https://example.com/winter-2024-2025.ics',
          'winter', 2024, 'spring', 2024,
        );
      });

      expect(results!).toHaveLength(2);
      expect(mockImportSemester).toHaveBeenCalledTimes(2);
    });

    it('returns success and failure results', async () => {
      mockFetchICSData
        .mockResolvedValueOnce({
          semesterName: 'Winter 2024-2025',
          courses: [makeParsedCourse('C1')],
        })
        .mockRejectedValueOnce(new Error('404 Not Found'));

      const { result } = renderHook(() => useImportExport());
      let results: { success: boolean; error?: string; semesterName?: string }[];

      await act(async () => {
        results = await result.current.importBatchICS(
          'https://example.com/winter-2024-2025.ics',
          'winter', 2024, 'spring', 2024,
        );
      });

      expect(results![0]!.success).toBe(true);
      expect(results![0]!.semesterName).toBe('Winter 2024-2025');
      expect(results![1]!.success).toBe(false);
      expect(results![1]!.error).toBe('404 Not Found');
    });

    it('throws when range produces no URLs', async () => {
      const { result } = renderHook(() => useImportExport());

      await expect(
        act(async () => {
          await result.current.importBatchICS(
            'https://example.com/test.ics',
            'summer', 2025, 'winter', 2024,
          );
        }),
      ).rejects.toThrow('No semesters in the specified range.');
    });

    it('resets isImporting after batch completes', async () => {
      mockFetchICSData.mockResolvedValue({
        semesterName: 'Test',
        courses: [makeParsedCourse('C1')],
      });

      const { result } = renderHook(() => useImportExport());

      await act(async () => {
        await result.current.importBatchICS(
          'https://example.com/winter-2024-2025.ics',
          'winter', 2024, 'winter', 2024,
        );
      });

      expect(result.current.isImporting).toBe(false);
      expect(result.current.importProgress).toBe('');
    });
  });

  // =========================================================================
  // fetchTechnionCatalog
  // =========================================================================

  describe('fetchTechnionCatalog', () => {
    it('returns 0 updates when no current semester', async () => {
      mockFetchSemesterList.mockResolvedValue(['202401', '202402']);
      mockBuildCourseCatalog.mockResolvedValue({ catalog: new Map(), size: 500 });
      mockCurrentSemesterId = null;

      const { result } = renderHook(() => useImportExport());
      let catalogResult: { updatedCount: number; catalogSize: number } | undefined;

      await act(async () => {
        catalogResult = await result.current.fetchTechnionCatalog();
      });

      expect(catalogResult!.updatedCount).toBe(0);
      expect(catalogResult!.catalogSize).toBe(500);
    });

    it('returns 0 updates when semester has no courses', async () => {
      mockSemesters = [{ id: 's1', name: 'Test', courses: [], calendarSettings: {} }];
      mockCurrentSemesterId = 's1';
      mockFetchSemesterList.mockResolvedValue(['202401']);
      mockBuildCourseCatalog.mockResolvedValue({ catalog: new Map(), size: 100 });

      const { result } = renderHook(() => useImportExport());
      let catalogResult: { updatedCount: number; catalogSize: number } | undefined;

      await act(async () => {
        catalogResult = await result.current.fetchTechnionCatalog();
      });

      expect(catalogResult!.updatedCount).toBe(0);
    });

    it('enriches courses when catalog data available', async () => {
      const course = { id: 'c1', name: 'CS Intro', number: '234111', points: '', lecturer: '', faculty: '', syllabus: '' };
      const enriched = { ...course, points: '3.0', lecturer: 'Prof. B', faculty: 'CS', syllabus: 'https://syl.com' };

      mockSemesters = [{
        id: 's1', name: 'Test',
        courses: [course],
        calendarSettings: {},
      }];
      mockCurrentSemesterId = 's1';
      mockFetchSemesterList.mockResolvedValue(['202401']);
      mockBuildCourseCatalog.mockResolvedValue({ catalog: new Map(), size: 200 });
      mockEnrichCoursesWithCatalog.mockReturnValue({
        courses: [enriched],
        updatedCount: 1,
      });

      const { result } = renderHook(() => useImportExport());
      let catalogResult: { updatedCount: number; catalogSize: number } | undefined;

      await act(async () => {
        catalogResult = await result.current.fetchTechnionCatalog();
      });

      expect(catalogResult!.updatedCount).toBe(1);
      expect(mockUpdateCourse).toHaveBeenCalledWith('s1', 'c1', expect.objectContaining({
        points: '3.0',
        lecturer: 'Prof. B',
      }));
    });

    it('resets isFetchingCatalog on error', async () => {
      mockFetchSemesterList.mockRejectedValue(new Error('Catalog unavailable'));

      const { result } = renderHook(() => useImportExport());

      await expect(
        act(async () => {
          await result.current.fetchTechnionCatalog();
        }),
      ).rejects.toThrow('Catalog unavailable');

      expect(result.current.isFetchingCatalog).toBe(false);
    });

    it('resets isFetchingCatalog after success', async () => {
      mockFetchSemesterList.mockResolvedValue([]);
      mockBuildCourseCatalog.mockResolvedValue({ catalog: new Map(), size: 0 });

      const { result } = renderHook(() => useImportExport());

      await act(async () => {
        await result.current.fetchTechnionCatalog();
      });

      expect(result.current.isFetchingCatalog).toBe(false);
      expect(result.current.catalogProgress).toBe('');
    });
  });
});

// ===========================================================================
// generateBatchUrls — pure function, no hooks needed
// ===========================================================================

describe('generateBatchUrls', () => {
  it('generates a single URL for same start and end', () => {
    const urls = generateBatchUrls(
      'https://example.com/winter-2024-2025.ics',
      'winter', 2024, 'winter', 2024,
    );
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('winter-2024-2025.ics');
  });

  it('generates correct URLs for winter-to-summer range', () => {
    const urls = generateBatchUrls(
      'https://example.com/winter-2024-2025.ics',
      'winter', 2024, 'summer', 2024,
    );
    expect(urls).toHaveLength(3);
    expect(urls[0]).toContain('winter-2024-2025.ics');
    expect(urls[1]).toContain('spring-2024.ics');
    expect(urls[2]).toContain('summer-2024.ics');
  });

  it('handles multi-year range', () => {
    const urls = generateBatchUrls(
      'https://example.com/winter-2023-2024.ics',
      'winter', 2023, 'winter', 2024,
    );
    // winter 2023-2024, spring 2023, summer 2023, winter 2024-2025
    expect(urls.length).toBeGreaterThanOrEqual(4);
  });

  it('returns empty for impossible range (end before start)', () => {
    const urls = generateBatchUrls(
      'https://example.com/summer-2025.ics',
      'summer', 2025, 'winter', 2024,
    );
    expect(urls).toHaveLength(0);
  });

  it('generates correct filename format for winter (year-year)', () => {
    const urls = generateBatchUrls(
      'https://example.com/winter-2024-2025.ics',
      'winter', 2024, 'winter', 2024,
    );
    expect(urls[0]).toMatch(/winter-2024-2025\.ics$/);
  });

  it('generates correct filename format for spring (year)', () => {
    const urls = generateBatchUrls(
      'https://example.com/spring-2024.ics',
      'spring', 2024, 'spring', 2024,
    );
    expect(urls[0]).toMatch(/spring-2024\.ics$/);
  });

  it('generates correct filename format for summer (year)', () => {
    const urls = generateBatchUrls(
      'https://example.com/summer-2024.ics',
      'summer', 2024, 'summer', 2024,
    );
    expect(urls[0]).toMatch(/summer-2024\.ics$/);
  });

  it('preserves base URL path', () => {
    const urls = generateBatchUrls(
      'https://calendar.example.com/deep/path/winter-2024-2025.ics',
      'winter', 2024, 'winter', 2024,
    );
    expect(urls[0]).toContain('https://calendar.example.com/deep/path/');
  });

  it('handles case-insensitive season names', () => {
    const urls = generateBatchUrls(
      'https://example.com/winter-2024-2025.ics',
      'Winter', 2024, 'Spring', 2024,
    );
    expect(urls).toHaveLength(2);
  });

  it('defaults to winter for unknown season', () => {
    const urls = generateBatchUrls(
      'https://example.com/winter-2024-2025.ics',
      'unknown', 2024, 'winter', 2024,
    );
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toContain('winter');
  });
});
