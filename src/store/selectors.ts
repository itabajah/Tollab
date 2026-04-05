/**
 * Derived-state selector hooks for the Tollab app.
 *
 * Each hook reads from one or more Zustand stores and returns
 * computed / filtered / sorted data ready for components to consume.
 *
 * Selectors that return computed objects/arrays use shallow equality
 * to prevent unnecessary re-renders.
 */

import type {
  Course,
  Homework,
  HomeworkSortOrder,
  RecordingItem,
  RecordingSortOrder,
  Semester,
} from '@/types';

import { type AppStore, useAppStore } from './app-store';

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

import { parseDate, startOfDay } from '@/utils/date';

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
// Equality helpers for memoized selectors
// ---------------------------------------------------------------------------

/**
 * Creates a memoized selector that returns the previous result reference
 * when the new result is structurally equal to the old one.
 * This prevents Zustand from triggering unnecessary re-renders.
 */
function memoize<S, R>(
  selector: (state: S) => R,
  eq: (a: R, b: R) => boolean,
): (state: S) => R {
  let cached: { result: R } | null = null;
  return (state: S) => {
    const result = selector(state);
    if (cached !== null && eq(cached.result, result)) {
      return cached.result;
    }
    cached = { result };
    return result;
  };
}

/** Shallow array equality — same length, same item references. */
function shallowArray<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Shallow equality for HomeworkByUrgency — all five arrays compared by reference. */
function homeworkByUrgencyEqual(a: HomeworkByUrgency, b: HomeworkByUrgency): boolean {
  return (
    shallowArray(a.overdue, b.overdue) &&
    shallowArray(a.today, b.today) &&
    shallowArray(a.thisWeek, b.thisWeek) &&
    shallowArray(a.upcoming, b.upcoming) &&
    shallowArray(a.noDate, b.noDate)
  );
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

/** All courses in the current semester. Memoized to prevent unnecessary re-renders. */
const allCoursesSelector = memoize(
  (state: AppStore) => {
    const semester = state.semesters.find(
      (s) => s.id === state.currentSemesterId,
    );
    return semester?.courses ?? EMPTY_COURSES;
  },
  shallowArray,
);

export function useAllCourses(): Course[] {
  return useAppStore(allCoursesSelector);
}

const EMPTY_COURSES: Course[] = [];

/** Homework across all courses in the current semester, grouped by urgency. */
const homeworkByUrgencySelector = memoize(
  (state: AppStore) => {
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
  },
  homeworkByUrgencyEqual,
);

export function useHomeworkByUrgency(): HomeworkByUrgency {
  return useAppStore(homeworkByUrgencySelector);
}

/** Recording and homework progress for a course. Memoized via structural equality. */
export function useCourseProgress(courseId: string): CourseProgress {
  return useAppStore(
    memoize(
      (state: AppStore) => {
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
      },
      (a, b) =>
        a.watchedCount === b.watchedCount &&
        a.totalRecordings === b.totalRecordings &&
        a.completedHomework === b.completedHomework &&
        a.totalHomework === b.totalHomework,
    ),
  );
}

/** Sorted recordings for a given course and tab index. Memoized via shallow equality. */
export function useSortedRecordings(
  courseId: string,
  tabIndex: number,
): IndexedRecording[] {
  return useAppStore(
    memoize(
      (state: AppStore) => {
        const semester = state.semesters.find(
          (s) => s.id === state.currentSemesterId,
        );
        if (!semester) return EMPTY_RECORDINGS;

        const course = semester.courses.find((c) => c.id === courseId);
        if (!course) return EMPTY_RECORDINGS;

        const tab = course.recordings.tabs[tabIndex];
        if (!tab) return EMPTY_RECORDINGS;

        const tabSortOrders = state.recordingSortOrders[courseId];
        const order: RecordingSortOrder =
          (tabSortOrders?.[tab.id] as RecordingSortOrder | undefined) ?? 'default';

        return sortRecordingItems(tab.items, order);
      },
      shallowArray,
    ),
  );
}

const EMPTY_RECORDINGS: IndexedRecording[] = [];

/** Sorted homework for a given course. Memoized via shallow equality. */
export function useSortedHomework(courseId: string): IndexedHomework[] {
  return useAppStore(
    memoize(
      (state: AppStore) => {
        const semester = state.semesters.find(
          (s) => s.id === state.currentSemesterId,
        );
        if (!semester) return EMPTY_HOMEWORK;

        const course = semester.courses.find((c) => c.id === courseId);
        if (!course) return EMPTY_HOMEWORK;

        const order: HomeworkSortOrder =
          (state.homeworkSortOrders[courseId] as HomeworkSortOrder | undefined) ??
          'manual';

        return sortHomeworkItems(course.homework, order);
      },
      shallowArray,
    ),
  );
}

const EMPTY_HOMEWORK: IndexedHomework[] = [];
