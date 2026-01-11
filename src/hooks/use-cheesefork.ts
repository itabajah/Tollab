/**
 * React hooks for Cheesefork API integration
 * Handles fetching, caching, and searching course data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheeseforkCourse,
  CheeseforkSemester,
  fetchAvailableSemesters,
  fetchCourses,
  searchCourses as searchCoursesUtil,
  getCurrentSemesterCode,
} from '@/lib/cheesefork';

// Cache for course data
const courseCache = new Map<string, CheeseforkCourse[]>();
let semesterCache: CheeseforkSemester[] | null = null;

// Loading states to prevent duplicate requests
const loadingPromises = new Map<string, Promise<CheeseforkCourse[]>>();
let semesterLoadingPromise: Promise<CheeseforkSemester[]> | null = null;

/**
 * Hook to fetch and manage available semesters
 */
export function useSemesters() {
  const [semesters, setSemesters] = useState<CheeseforkSemester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadSemesters() {
      try {
        setLoading(true);
        setError(null);

        // Return cached data if available
        if (semesterCache) {
          setSemesters(semesterCache);
          setLoading(false);
          return;
        }

        // Reuse existing promise if already loading
        if (!semesterLoadingPromise) {
          semesterLoadingPromise = fetchAvailableSemesters().finally(() => {
            semesterLoadingPromise = null;
          });
        }

        const data = await semesterLoadingPromise;
        semesterCache = data;
        setSemesters(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch semesters'));
      } finally {
        setLoading(false);
      }
    }

    loadSemesters();
  }, []);

  const currentSemesterCode = useMemo(() => getCurrentSemesterCode(), []);

  const currentSemester = useMemo(() => {
    return semesters.find((s) => s.code === currentSemesterCode) || semesters[0];
  }, [semesters, currentSemesterCode]);

  return {
    semesters,
    currentSemester,
    currentSemesterCode,
    loading,
    error,
  };
}

/**
 * Hook to fetch and manage course data for a specific semester
 */
export function useCourses(semesterCode: string | null) {
  const [courses, setCourses] = useState<CheeseforkCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!semesterCode) {
      setCourses([]);
      return;
    }

    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);

        // Return cached data if available
        if (courseCache.has(semesterCode)) {
          setCourses(courseCache.get(semesterCode)!);
          setLoading(false);
          return;
        }

        // Reuse existing promise if already loading
        let promise = loadingPromises.get(semesterCode);
        if (!promise) {
          promise = fetchCourses(semesterCode).finally(() => {
            loadingPromises.delete(semesterCode);
          });
          loadingPromises.set(semesterCode, promise);
        }

        const data = await promise;
        courseCache.set(semesterCode, data);
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch courses'));
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, [semesterCode]);

  return { courses, loading, error };
}

/**
 * Hook to search courses with debounced query
 */
export function useCourseSearch(
  courses: CheeseforkCourse[],
  query: string,
  limit: number = 50
) {
  const [results, setResults] = useState<CheeseforkCourse[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);

    // Debounce the search
    const timeoutId = setTimeout(() => {
      const searchResults = searchCoursesUtil(courses, query, limit);
      setResults(searchResults);
      setSearching(false);
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [courses, query, limit]);

  return { results, searching };
}

/**
 * Combined hook for full course search functionality
 */
export function useCourseCatalog(semesterCode: string | null) {
  const { courses, loading: coursesLoading, error: coursesError } = useCourses(semesterCode);
  const [searchQuery, setSearchQuery] = useState('');
  const { results, searching } = useCourseSearch(courses, searchQuery);

  const searchCourses = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const getCourseByNumber = useCallback(
    (courseNumber: string) => {
      return courses.find((c) => c.courseNumber === courseNumber);
    },
    [courses]
  );

  return {
    // Course catalog
    courses,
    coursesLoading,
    coursesError,
    totalCourses: courses.length,

    // Search
    searchQuery,
    searchCourses,
    searchResults: results,
    searching,

    // Utilities
    getCourseByNumber,
  };
}

/**
 * Clear all cached data
 */
export function clearCheeseforkCache() {
  courseCache.clear();
  semesterCache = null;
}

/**
 * Preload courses for a semester (useful for prefetching)
 */
export async function preloadCourses(semesterCode: string): Promise<void> {
  if (courseCache.has(semesterCode)) return;

  const courses = await fetchCourses(semesterCode);
  courseCache.set(semesterCode, courses);
}
