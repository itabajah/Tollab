/**
 * Tests for technion-catalog.ts — Technion SAP course catalog service.
 *
 * Global fetch is mocked. Tests cover semester list fetching, catalog building,
 * course enrichment, and matching strategies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock API constant
// ---------------------------------------------------------------------------

vi.mock('@/constants/api', () => ({
  TECHNION_SAP_BASE_URL: 'https://test-sap.example.com/',
}));

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------

import {
  fetchSemesterList,
  buildCourseCatalog,
  fetchCourseMetadata,
  enrichCourseWithMetadata,
  enrichCoursesWithCatalog,
  type SAPSemester,
  type CourseMetadata,
} from '@/services/technion-catalog';
import type { Course } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c1',
    name: '',
    number: '',
    points: '',
    lecturer: '',
    faculty: '',
    location: '',
    grade: '',
    color: '',
    syllabus: '',
    notes: '',
    exams: { moedA: '', moedB: '' },
    schedule: [],
    homework: [],
    recordings: { tabs: [] },
    ...overrides,
  };
}

function makeSAPEntry(courseNumber: string, courseName: string, extra: Record<string, string> = {}) {
  return {
    general: {
      'מספר מקצוע': courseNumber,
      'שם מקצוע': courseName,
      'נקודות': extra['points'] ?? '3.0',
      'אחראים': extra['lecturer'] ?? 'Dr. Test',
      'פקולטה': extra['faculty'] ?? 'CS',
      'סילבוס': extra['syllabus'] ?? 'https://syllabus.test',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('technion-catalog', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // =========================================================================
  // fetchSemesterList
  // =========================================================================

  describe('fetchSemesterList', () => {
    it('fetches and returns semester list', async () => {
      const semesters: SAPSemester[] = [
        { year: 2024, semester: 1 },
        { year: 2024, semester: 2 },
      ];
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(semesters),
      });

      const result = await fetchSemesterList();

      expect(result).toEqual(semesters);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test-sap.example.com/last_semesters.json',
      );
    });

    it('throws on HTTP error', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchSemesterList()).rejects.toThrow(
        'Failed to fetch semester list',
      );
    });

    it('throws on empty semester list', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await expect(fetchSemesterList()).rejects.toThrow('No semester data');
    });
  });

  // =========================================================================
  // buildCourseCatalog
  // =========================================================================

  describe('buildCourseCatalog', () => {
    it('builds catalog from semester data', async () => {
      const semesters: SAPSemester[] = [{ year: 2024, semester: 1 }];
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            makeSAPEntry('234111', 'Intro to CS'),
            makeSAPEntry('234218', 'Data Structures'),
          ]),
      });

      const { catalog, size } = await buildCourseCatalog(semesters);

      expect(size).toBe(2);
      expect(catalog.get('234111')).toBeDefined();
      expect(catalog.get('234111')!.courseName).toBe('Intro to CS');
    });

    it('handles multiple semesters', async () => {
      const semesters: SAPSemester[] = [
        { year: 2024, semester: 1 },
        { year: 2024, semester: 2 },
      ];
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([makeSAPEntry('111', 'Course A')]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([makeSAPEntry('222', 'Course B')]),
        });

      const { catalog, size } = await buildCourseCatalog(semesters);

      expect(size).toBe(2);
      expect(catalog.has('111')).toBe(true);
      expect(catalog.has('222')).toBe(true);
    });

    it('skips entries without course number', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { general: { 'שם מקצוע': 'No Number' } },
            makeSAPEntry('123', 'Has Number'),
          ]),
      });

      const { size } = await buildCourseCatalog([{ year: 2024, semester: 1 }]);
      expect(size).toBe(1);
    });

    it('silently skips unavailable semester files', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { size } = await buildCourseCatalog([{ year: 2024, semester: 1 }]);
      expect(size).toBe(0);
    });

    it('skips semesters with non-ok responses', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { size } = await buildCourseCatalog([{ year: 2024, semester: 1 }]);
      expect(size).toBe(0);
    });

    it('calls onProgress callback', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const onProgress = vi.fn();
      await buildCourseCatalog([{ year: 2024, semester: 1 }], onProgress);

      expect(onProgress).toHaveBeenCalledWith(
        expect.stringContaining('2024'),
      );
    });
  });

  // =========================================================================
  // enrichCourseWithMetadata
  // =========================================================================

  describe('enrichCourseWithMetadata', () => {
    const metadata: CourseMetadata = {
      courseNumber: '234111',
      courseName: 'Intro to CS',
      points: '3.0',
      lecturer: 'Dr. Test',
      faculty: 'CS',
      syllabus: 'https://syllabus.test',
    };

    it('fills in empty fields from metadata', () => {
      const course = makeCourse({ id: 'c1', name: 'Intro' });
      const enriched = enrichCourseWithMetadata(course, metadata);

      expect(enriched.points).toBe('3.0');
      expect(enriched.lecturer).toBe('Dr. Test');
      expect(enriched.faculty).toBe('CS');
      expect(enriched.syllabus).toBe('https://syllabus.test');
      expect(enriched.number).toBe('234111');
    });

    it('does not overwrite existing values', () => {
      const course = makeCourse({
        points: '4.0',
        lecturer: 'Prof. Existing',
      });
      const enriched = enrichCourseWithMetadata(course, metadata);

      expect(enriched.points).toBe('4.0');
      expect(enriched.lecturer).toBe('Prof. Existing');
      // But fills missing ones
      expect(enriched.faculty).toBe('CS');
    });

    it('returns original course reference when nothing changed', () => {
      const course = makeCourse({
        points: '3.0',
        lecturer: 'Dr. Test',
        faculty: 'CS',
        syllabus: 'https://syllabus.test',
        number: '234111',
      });
      const enriched = enrichCourseWithMetadata(course, metadata);

      expect(enriched).toBe(course);
    });

    it('returns new object when fields were enriched', () => {
      const course = makeCourse();
      const enriched = enrichCourseWithMetadata(course, metadata);

      expect(enriched).not.toBe(course);
    });
  });

  // =========================================================================
  // enrichCoursesWithCatalog
  // =========================================================================

  describe('enrichCoursesWithCatalog', () => {
    it('enriches courses with exact number match', () => {
      const catalog = new Map<string, CourseMetadata>([
        [
          '234111',
          {
            courseNumber: '234111',
            courseName: 'Intro',
            points: '3.0',
            lecturer: 'Prof',
            faculty: 'CS',
            syllabus: '',
          },
        ],
      ]);
      const courses = [makeCourse({ number: '234111' })];

      const { courses: enriched, updatedCount } = enrichCoursesWithCatalog(
        courses,
        catalog,
      );

      expect(updatedCount).toBe(1);
      expect(enriched[0]!.points).toBe('3.0');
    });

    it('matches by partial course number', () => {
      const catalog = new Map<string, CourseMetadata>([
        [
          '1234567',
          {
            courseNumber: '1234567',
            courseName: 'Deep',
            points: '2.5',
            lecturer: 'Prof B',
            faculty: 'EE',
            syllabus: '',
          },
        ],
      ]);
      const courses = [makeCourse({ number: '34567' })];

      const { updatedCount } = enrichCoursesWithCatalog(courses, catalog);
      expect(updatedCount).toBe(1);
    });

    it('matches by name when number has no match', () => {
      const catalog = new Map<string, CourseMetadata>([
        [
          '999',
          {
            courseNumber: '999',
            courseName: 'algorithms advanced',
            points: '4.0',
            lecturer: 'Dr. Alg',
            faculty: 'CS',
            syllabus: '',
          },
        ],
      ]);
      const courses = [makeCourse({ name: 'algorithms' })];

      const { updatedCount } = enrichCoursesWithCatalog(courses, catalog);
      expect(updatedCount).toBe(1);
    });

    it('reports 0 when no matches found', () => {
      const catalog = new Map<string, CourseMetadata>();
      const courses = [makeCourse({ name: 'Unknown Course' })];

      const { updatedCount } = enrichCoursesWithCatalog(courses, catalog);
      expect(updatedCount).toBe(0);
    });

    it('does not count already-complete courses', () => {
      const catalog = new Map<string, CourseMetadata>([
        [
          '234111',
          {
            courseNumber: '234111',
            courseName: 'Intro',
            points: '3.0',
            lecturer: 'Prof',
            faculty: 'CS',
            syllabus: 'link',
          },
        ],
      ]);
      const courses = [
        makeCourse({
          number: '234111',
          points: '3.0',
          lecturer: 'Prof',
          faculty: 'CS',
          syllabus: 'link',
        }),
      ];

      const { updatedCount } = enrichCoursesWithCatalog(courses, catalog);
      expect(updatedCount).toBe(0);
    });
  });

  // =========================================================================
  // fetchCourseMetadata
  // =========================================================================

  describe('fetchCourseMetadata', () => {
    it('fetches semester list and builds catalog to find course', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      // fetchSemesterList
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ year: 2024, semester: 1 }] as SAPSemester[]),
      });
      // buildCourseCatalog
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeSAPEntry('234111', 'Intro to CS')]),
      });

      const meta = await fetchCourseMetadata('234111');

      expect(meta.courseNumber).toBe('234111');
      expect(meta.courseName).toBe('Intro to CS');
    });

    it('throws when course is not found', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ year: 2024, semester: 1 }] as SAPSemester[]),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeSAPEntry('111', 'Other')]),
      });

      await expect(fetchCourseMetadata('999999')).rejects.toThrow(
        'not found in Technion catalog',
      );
    });

    it('strips non-digit characters from courseId', async () => {
      const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ year: 2024, semester: 1 }] as SAPSemester[]),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([makeSAPEntry('234111', 'CS Intro')]),
      });

      const meta = await fetchCourseMetadata('CS-234111');
      expect(meta.courseNumber).toBe('234111');
    });
  });
});
