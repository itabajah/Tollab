/**
 * React hook for schedule conflict detection
 */

import { useMemo } from 'react';
import { useDataStore } from '@/stores';
import {
  findConflicts,
  getCoursesWithConflicts,
  getConflictsForCourse,
  type ScheduleConflict,
} from '@/lib/schedule-conflicts';

/**
 * Hook to detect schedule conflicts for the active semester
 */
export function useScheduleConflicts() {
  const getActiveSemester = useDataStore((state) => state.getActiveSemester);
  const semester = getActiveSemester();

  const conflicts = useMemo(() => {
    if (!semester) return [];
    return findConflicts(semester.courses);
  }, [semester]);

  const coursesWithConflicts = useMemo(() => {
    if (!semester) return new Set<string>();
    return getCoursesWithConflicts(semester.courses);
  }, [semester]);

  const getConflicts = (courseId: string): ScheduleConflict[] => {
    if (!semester) return [];
    return getConflictsForCourse(courseId, semester.courses);
  };

  const hasConflict = (courseId: string): boolean => {
    return coursesWithConflicts.has(courseId);
  };

  const totalConflicts = conflicts.length;

  return {
    conflicts,
    coursesWithConflicts,
    totalConflicts,
    getConflicts,
    hasConflict,
  };
}
