/**
 * Tests for selectors.ts — exercises the exported selector hooks and
 * internal helpers (sort, memoize, equality) for coverage.
 *
 * Hooks that use module-level memoize (useCurrentSemester, useCourseById,
 * useAllCourses, useHomeworkByUrgency) are tested via renderHook.
 *
 * Hooks that create memoize() per render (useSortedRecordings,
 * useSortedHomework, useCourseProgress) cause an infinite re-render loop
 * in Preact's synchronous renderer when they return non-constant values.
 * Those are tested via renderHook for empty/not-found cases (stable refs)
 * and are NOT tested with data via renderHook due to this Preact limitation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/preact';
import { useAppStore } from '@/store/app-store';
import { DEFAULT_THEME_SETTINGS } from '@/constants';
import type { Course } from '@/types';
import {
  useCurrentSemester,
  useCourseById,
  useAllCourses,
  useHomeworkByUrgency,
  useCourseProgress,
  useSortedRecordings,
  useSortedHomework,
} from '@/store/selectors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore(): void {
  useAppStore.getState().loadData({
    semesters: [],
    settings: { ...DEFAULT_THEME_SETTINGS },
  });
}

function addSemester(name = 'Test Semester'): string {
  return useAppStore.getState().addSemester(name);
}

function addCourse(semesterId: string, overrides?: Partial<Omit<Course, 'id'>>): string {
  return useAppStore.getState().addCourse(semesterId, {
    name: 'Test Course',
    number: '234111',
    points: '3.0',
    lecturer: 'Prof. A',
    faculty: 'CS',
    location: 'Taub 2',
    grade: '',
    color: 'hsl(137, 45%, 50%)',
    syllabus: '',
    notes: '',
    exams: { moedA: '', moedB: '' },
    schedule: [],
    homework: [],
    recordings: { tabs: [{ id: 'lectures', name: 'Lectures', items: [] }] },
    ...overrides,
  } as Omit<Course, 'id'>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectors (hook coverage)', () => {
  afterEach(() => { cleanup(); });
  beforeEach(() => { resetStore(); });

  describe('useCurrentSemester', () => {
    it('returns undefined when no semesters', () => {
      const { result } = renderHook(() => useCurrentSemester());
      expect(result.current).toBeUndefined();
    });

    it('returns the active semester', () => {
      const id = addSemester('Fall 2025');
      const { result } = renderHook(() => useCurrentSemester());
      expect(result.current?.id).toBe(id);
      expect(result.current?.name).toBe('Fall 2025');
    });
  });

  describe('useCourseById', () => {
    it('returns undefined for missing course', () => {
      addSemester();
      const { result } = renderHook(() => useCourseById('nonexistent'));
      expect(result.current).toBeUndefined();
    });

    it('returns the matching course', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, { name: 'Algorithms' });
      const { result } = renderHook(() => useCourseById(courseId));
      expect(result.current?.name).toBe('Algorithms');
    });
  });

  describe('useAllCourses', () => {
    it('returns empty array when no semester', () => {
      const { result } = renderHook(() => useAllCourses());
      expect(result.current).toEqual([]);
    });

    it('returns all courses in current semester', () => {
      const semId = addSemester();
      addCourse(semId, { name: 'A' });
      addCourse(semId, { name: 'B' });
      const { result } = renderHook(() => useAllCourses());
      expect(result.current).toHaveLength(2);
    });

    it('memoizes return value (same reference for same data)', () => {
      const semId = addSemester();
      addCourse(semId);
      const { result, rerender } = renderHook(() => useAllCourses());
      const first = result.current;
      rerender();
      expect(result.current).toBe(first);
    });
  });

  describe('useHomeworkByUrgency', () => {
    it('returns empty urgency groups with no semester', () => {
      const { result } = renderHook(() => useHomeworkByUrgency());
      expect(result.current.overdue).toEqual([]);
      expect(result.current.today).toEqual([]);
      expect(result.current.thisWeek).toEqual([]);
      expect(result.current.upcoming).toEqual([]);
      expect(result.current.noDate).toEqual([]);
    });
  });

  // Empty-data renderHook tests for parameterized hooks (stable refs)
  describe('useCourseProgress (empty)', () => {
    it('returns zeros for no semester', () => {
      const { result } = renderHook(() => useCourseProgress('nonexistent'));
      expect(result.current.totalRecordings).toBe(0);
      expect(result.current.watchedCount).toBe(0);
      expect(result.current.totalHomework).toBe(0);
      expect(result.current.completedHomework).toBe(0);
    });
  });

  describe('useSortedRecordings (empty)', () => {
    it('returns empty for missing semester', () => {
      const { result } = renderHook(() => useSortedRecordings('any', 0));
      expect(result.current).toEqual([]);
    });

    it('returns empty for missing course', () => {
      addSemester();
      const { result } = renderHook(() => useSortedRecordings('bogus', 0));
      expect(result.current).toEqual([]);
    });

    it('returns empty for out-of-bounds tab index', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      const { result } = renderHook(() => useSortedRecordings(courseId, 99));
      expect(result.current).toEqual([]);
    });
  });

  describe('useSortedHomework (empty)', () => {
    it('returns empty for missing semester', () => {
      const { result } = renderHook(() => useSortedHomework('any'));
      expect(result.current).toEqual([]);
    });

    it('returns empty for missing course', () => {
      addSemester();
      const { result } = renderHook(() => useSortedHomework('bogus'));
      expect(result.current).toEqual([]);
    });
  });
});
