/**
 * Derived-state selector hooks for the Tollab app.
 *
 * Each hook reads from one or more Zustand stores and returns
 * computed / filtered / sorted data ready for components to consume.
 */

import type {
  Course,
  Homework,
  HomeworkSortOrder,
  RecordingItem,
  RecordingSortOrder,
  Semester,
} from '@/types';

import { useAppStore } from './app-store';

// ---------------------------------------------------------------------------
// Exported helper types
// ---------------------------------------------------------------------------

/** A homework item decorated with its course context and array index. */
export interface HomeworkWithCourse {
  courseId: string;
  courseName: string;
  courseColor: string;
  homework: Homework;
  homeworkIndex: number;
}

/** Homework grouped by urgency relative to today. */
export interface HomeworkByUrgency {
  overdue: HomeworkWithCourse[];
  today: HomeworkWithCourse[];
  thisWeek: HomeworkWithCourse[];
  upcoming: HomeworkWithCourse[];
  noDate: HomeworkWithCourse[];
}

/** A recording item with its original array index (for CRUD by index). */
export interface IndexedRecording {
  item: RecordingItem;
  originalIndex: number;
}

/** A homework item with its original array index. */
export interface IndexedHomework {
  item: Homework;
  originalIndex: number;
}

/** Progress statistics for a course. */
export interface CourseProgress {
  watchedCount: number;
  totalRecordings: number;
  completedHomework: number;
  totalHomework: number;
}

// ---------------------------------------------------------------------------
// Date helpers (pure, no side effects)
// ---------------------------------------------------------------------------

/** Strip the time component and return a Date at midnight local. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parse a "YYYY-MM-DD" string to a midnight-local Date, or null. */
function parseDate(ymd: string): Date | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

/** Natural numeric sort key — extracts leading numbers from the name. */
function numericKey(name: string): number {
  const match = /(\d+)/.exec(name);
  return match?.[1] !== undefined ? parseInt(match[1], 10) : Infinity;
}

function sortRecordingItems(
  items: RecordingItem[],
  order: RecordingSortOrder,
): IndexedRecording[] {
  const indexed: IndexedRecording[] = items.map((item, i) => ({
    item,
    originalIndex: i,
  }));

  switch (order) {
    case 'manual':
      // Original array order
      return indexed;

    case 'name_asc':
      return indexed.sort((a, b) =>
        a.item.name.localeCompare(b.item.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

    case 'name_desc':
      return indexed.sort((a, b) =>
        b.item.name.localeCompare(a.item.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

    case 'watched_first':
      return indexed.sort((a, b) => {
        if (a.item.watched !== b.item.watched) {
          return a.item.watched ? -1 : 1;
        }
        return a.originalIndex - b.originalIndex;
      });

    case 'unwatched_first':
      return indexed.sort((a, b) => {
        if (a.item.watched !== b.item.watched) {
          return a.item.watched ? 1 : -1;
        }
        return a.originalIndex - b.originalIndex;
      });

    case 'default':
    default:
      // Default: natural numeric order based on name
      return indexed.sort((a, b) => {
        const na = numericKey(a.item.name);
        const nb = numericKey(b.item.name);
        if (na !== nb) return na - nb;
        return a.item.name.localeCompare(b.item.name, undefined, {
          numeric: true,
        });
      });
  }
}

function sortHomeworkItems(
  items: Homework[],
  order: HomeworkSortOrder,
): IndexedHomework[] {
  const indexed: IndexedHomework[] = items.map((item, i) => ({
    item,
    originalIndex: i,
  }));

  switch (order) {
    case 'manual':
      return indexed;

    case 'date_asc':
      return indexed.sort((a, b) => {
        if (!a.item.dueDate && !b.item.dueDate) return 0;
        if (!a.item.dueDate) return 1;
        if (!b.item.dueDate) return -1;
        return a.item.dueDate.localeCompare(b.item.dueDate);
      });

    case 'date_desc':
      return indexed.sort((a, b) => {
        if (!a.item.dueDate && !b.item.dueDate) return 0;
        if (!a.item.dueDate) return 1;
        if (!b.item.dueDate) return -1;
        return b.item.dueDate.localeCompare(a.item.dueDate);
      });

    case 'completed_first':
      return indexed.sort((a, b) => {
        if (a.item.completed !== b.item.completed) {
          return a.item.completed ? -1 : 1;
        }
        return a.originalIndex - b.originalIndex;
      });

    case 'incomplete_first':
      return indexed.sort((a, b) => {
        if (a.item.completed !== b.item.completed) {
          return a.item.completed ? 1 : -1;
        }
        return a.originalIndex - b.originalIndex;
      });

    case 'name_asc':
      return indexed.sort((a, b) =>
        a.item.title.localeCompare(b.item.title, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

    default:
      return indexed;
  }
}

// ---------------------------------------------------------------------------
// Selector hooks
// ---------------------------------------------------------------------------

/** The currently active semester, or undefined if none selected. */
export function useCurrentSemester(): Semester | undefined {
  return useAppStore((state) =>
    state.semesters.find((s) => s.id === state.currentSemesterId),
  );
}

/** Find a single course by ID within the current semester. */
export function useCourseById(courseId: string): Course | undefined {
  return useAppStore((state) => {
    const semester = state.semesters.find(
      (s) => s.id === state.currentSemesterId,
    );
    return semester?.courses.find((c) => c.id === courseId);
  });
}

/** All courses in the current semester. */
export function useAllCourses(): Course[] {
  return useAppStore((state) => {
    const semester = state.semesters.find(
      (s) => s.id === state.currentSemesterId,
    );
    return semester?.courses ?? [];
  });
}

/** Homework across all courses in the current semester, grouped by urgency. */
export function useHomeworkByUrgency(): HomeworkByUrgency {
  return useAppStore((state) => {
    const result: HomeworkByUrgency = {
      overdue: [],
      today: [],
      thisWeek: [],
      upcoming: [],
      noDate: [],
    };

    const semester = state.semesters.find(
      (s) => s.id === state.currentSemesterId,
    );
    if (!semester) return result;

    const now = startOfDay(new Date());

    for (const course of semester.courses) {
      for (let i = 0; i < course.homework.length; i++) {
        const hw = course.homework[i];
        if (!hw) continue;

        const entry: HomeworkWithCourse = {
          courseId: course.id,
          courseName: course.name,
          courseColor: course.color,
          homework: hw,
          homeworkIndex: i,
        };

        if (!hw.dueDate) {
          result.noDate.push(entry);
          continue;
        }

        const due = parseDate(hw.dueDate);
        if (!due) {
          result.noDate.push(entry);
          continue;
        }

        const diff = daysBetween(now, due);

        if (diff < 0 && !hw.completed) {
          result.overdue.push(entry);
        } else if (diff === 0) {
          result.today.push(entry);
        } else if (diff > 0 && diff <= 7) {
          result.thisWeek.push(entry);
        } else if (diff > 7) {
          result.upcoming.push(entry);
        } else {
          // diff < 0 && completed — completed overdue items go nowhere special
          result.overdue.push(entry);
        }
      }
    }

    return result;
  });
}

/** Recording and homework progress for a course. */
export function useCourseProgress(courseId: string): CourseProgress {
  return useAppStore((state) => {
    const result: CourseProgress = {
      watchedCount: 0,
      totalRecordings: 0,
      completedHomework: 0,
      totalHomework: 0,
    };

    const semester = state.semesters.find(
      (s) => s.id === state.currentSemesterId,
    );
    if (!semester) return result;

    const course = semester.courses.find((c) => c.id === courseId);
    if (!course) return result;

    for (const tab of course.recordings.tabs) {
      for (const item of tab.items) {
        result.totalRecordings++;
        if (item.watched) result.watchedCount++;
      }
    }

    result.totalHomework = course.homework.length;
    result.completedHomework = course.homework.filter(
      (h) => h.completed,
    ).length;

    return result;
  });
}

/** Sorted recordings for a given course and tab index. */
export function useSortedRecordings(
  courseId: string,
  tabIndex: number,
): IndexedRecording[] {
  return useAppStore((state) => {
    const semester = state.semesters.find(
      (s) => s.id === state.currentSemesterId,
    );
    if (!semester) return [];

    const course = semester.courses.find((c) => c.id === courseId);
    if (!course) return [];

    const tab = course.recordings.tabs[tabIndex];
    if (!tab) return [];

    const tabSortOrders = state.recordingSortOrders[courseId];
    const order: RecordingSortOrder =
      (tabSortOrders?.[tab.id] as RecordingSortOrder | undefined) ?? 'default';

    return sortRecordingItems(tab.items, order);
  });
}

/** Sorted homework for a given course. */
export function useSortedHomework(courseId: string): IndexedHomework[] {
  return useAppStore((state) => {
    const semester = state.semesters.find(
      (s) => s.id === state.currentSemesterId,
    );
    if (!semester) return [];

    const course = semester.courses.find((c) => c.id === courseId);
    if (!course) return [];

    const order: HomeworkSortOrder =
      (state.homeworkSortOrders[courseId] as HomeworkSortOrder | undefined) ??
      'manual';

    return sortHomeworkItems(course.homework, order);
  });
}
