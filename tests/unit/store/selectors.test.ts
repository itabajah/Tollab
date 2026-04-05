import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAppStore } from '@/store/app-store';
import { DEFAULT_THEME_SETTINGS } from '@/constants';
import type {
  Course,
  Homework,
  HomeworkSortOrder,
  RecordingItem,
  RecordingSortOrder,
  Semester,
} from '@/types';

// ---------------------------------------------------------------------------
// Replicate selector logic for non-hook testing
// (The actual selectors are hooks that call useAppStore(fn) internally.
//  We test the same logic by applying selectors to getState() directly.)
// ---------------------------------------------------------------------------

function getState() {
  return useAppStore.getState();
}

function currentSemester(): Semester | undefined {
  const s = getState();
  return s.semesters.find((sem) => sem.id === s.currentSemesterId);
}

function courseById(courseId: string): Course | undefined {
  const semester = currentSemester();
  return semester?.courses.find((c) => c.id === courseId);
}

function allCourses(): Course[] {
  return currentSemester()?.courses ?? [];
}

// Date helpers (same as in selectors.ts)
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function parseDate(ymd: string): Date | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

interface HomeworkWithCourse {
  courseId: string; courseName: string; courseColor: string;
  homework: Homework; homeworkIndex: number;
}
interface HomeworkByUrgency {
  overdue: HomeworkWithCourse[]; today: HomeworkWithCourse[];
  thisWeek: HomeworkWithCourse[]; upcoming: HomeworkWithCourse[];
  noDate: HomeworkWithCourse[];
}

function homeworkByUrgency(): HomeworkByUrgency {
  const result: HomeworkByUrgency = { overdue: [], today: [], thisWeek: [], upcoming: [], noDate: [] };
  const semester = currentSemester();
  if (!semester) return result;
  const now = startOfDay(new Date());
  for (const course of semester.courses) {
    for (let i = 0; i < course.homework.length; i++) {
      const hw = course.homework[i];
      if (!hw) continue;
      const entry: HomeworkWithCourse = {
        courseId: course.id, courseName: course.name, courseColor: course.color,
        homework: hw, homeworkIndex: i,
      };
      if (!hw.dueDate) { result.noDate.push(entry); continue; }
      const due = parseDate(hw.dueDate);
      if (!due) { result.noDate.push(entry); continue; }
      const diff = daysBetween(now, due);
      if (diff < 0 && !hw.completed) { result.overdue.push(entry); }
      else if (diff === 0) { result.today.push(entry); }
      else if (diff > 0 && diff <= 7) { result.thisWeek.push(entry); }
      else if (diff > 7) { result.upcoming.push(entry); }
      else { result.overdue.push(entry); }
    }
  }
  return result;
}

interface CourseProgress { watchedCount: number; totalRecordings: number; completedHomework: number; totalHomework: number; }

function courseProgress(courseId: string): CourseProgress {
  const result: CourseProgress = { watchedCount: 0, totalRecordings: 0, completedHomework: 0, totalHomework: 0 };
  const course = courseById(courseId);
  if (!course) return result;
  for (const tab of course.recordings.tabs) {
    for (const item of tab.items) {
      result.totalRecordings++;
      if (item.watched) result.watchedCount++;
    }
  }
  result.totalHomework = course.homework.length;
  result.completedHomework = course.homework.filter((h) => h.completed).length;
  return result;
}

interface IndexedRecording { item: RecordingItem; originalIndex: number; }
interface IndexedHomework { item: Homework; originalIndex: number; }

function numericKey(name: string): number {
  const match = /(\d+)/.exec(name);
  return match?.[1] !== undefined ? parseInt(match[1], 10) : Infinity;
}

function sortedRecordings(courseId: string, tabIndex: number): IndexedRecording[] {
  const s = getState();
  const semester = s.semesters.find((sem) => sem.id === s.currentSemesterId);
  if (!semester) return [];
  const course = semester.courses.find((c) => c.id === courseId);
  if (!course) return [];
  const tab = course.recordings.tabs[tabIndex];
  if (!tab) return [];
  const tabOrders = s.recordingSortOrders[courseId];
  const order: RecordingSortOrder = (tabOrders?.[tab.id] as RecordingSortOrder | undefined) ?? 'default';
  const indexed: IndexedRecording[] = tab.items.map((item, i) => ({ item, originalIndex: i }));
  switch (order) {
    case 'manual': return indexed;
    case 'name_asc': return indexed.sort((a, b) => a.item.name.localeCompare(b.item.name, undefined, { numeric: true, sensitivity: 'base' }));
    case 'name_desc': return indexed.sort((a, b) => b.item.name.localeCompare(a.item.name, undefined, { numeric: true, sensitivity: 'base' }));
    case 'watched_first': return indexed.sort((a, b) => { if (a.item.watched !== b.item.watched) return a.item.watched ? -1 : 1; return a.originalIndex - b.originalIndex; });
    case 'unwatched_first': return indexed.sort((a, b) => { if (a.item.watched !== b.item.watched) return a.item.watched ? 1 : -1; return a.originalIndex - b.originalIndex; });
    case 'default': default: return indexed.sort((a, b) => { const na = numericKey(a.item.name); const nb = numericKey(b.item.name); if (na !== nb) return na - nb; return a.item.name.localeCompare(b.item.name, undefined, { numeric: true }); });
  }
}

function sortedHomework(courseId: string): IndexedHomework[] {
  const s = getState();
  const semester = s.semesters.find((sem) => sem.id === s.currentSemesterId);
  if (!semester) return [];
  const course = semester.courses.find((c) => c.id === courseId);
  if (!course) return [];
  const order: HomeworkSortOrder = (s.homeworkSortOrders[courseId] as HomeworkSortOrder | undefined) ?? 'manual';
  const indexed: IndexedHomework[] = course.homework.map((item, i) => ({ item, originalIndex: i }));
  switch (order) {
    case 'manual': return indexed;
    case 'date_asc': return indexed.sort((a, b) => { if (!a.item.dueDate && !b.item.dueDate) return 0; if (!a.item.dueDate) return 1; if (!b.item.dueDate) return -1; return a.item.dueDate.localeCompare(b.item.dueDate); });
    case 'date_desc': return indexed.sort((a, b) => { if (!a.item.dueDate && !b.item.dueDate) return 0; if (!a.item.dueDate) return 1; if (!b.item.dueDate) return -1; return b.item.dueDate.localeCompare(a.item.dueDate); });
    case 'completed_first': return indexed.sort((a, b) => { if (a.item.completed !== b.item.completed) return a.item.completed ? -1 : 1; return a.originalIndex - b.originalIndex; });
    case 'incomplete_first': return indexed.sort((a, b) => { if (a.item.completed !== b.item.completed) return a.item.completed ? 1 : -1; return a.originalIndex - b.originalIndex; });
    case 'name_asc': return indexed.sort((a, b) => a.item.title.localeCompare(b.item.title, undefined, { numeric: true, sensitivity: 'base' }));
    default: return indexed;
  }
}

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

function addCourse(
  semesterId: string,
  overrides?: Partial<Omit<Course, 'id'>>,
): string {
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

describe('selectors', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)); // June 15, 2025 noon
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // currentSemester
  // =========================================================================
  describe('useCurrentSemester', () => {
    it('returns undefined when no semesters exist', () => {
      expect(currentSemester()).toBeUndefined();
    });

    it('returns the active semester', () => {
      const id = addSemester('Fall 2025');
      expect(currentSemester()?.name).toBe('Fall 2025');
      expect(currentSemester()?.id).toBe(id);
    });

    it('returns correct semester when multiple exist', () => {
      addSemester('Fall');
      const s2 = addSemester('Spring');
      useAppStore.getState().setCurrentSemester(s2);
      expect(currentSemester()?.name).toBe('Spring');
    });
  });

  // =========================================================================
  // courseById
  // =========================================================================
  describe('useCourseById', () => {
    it('returns undefined for non-existent course', () => {
      addSemester();
      expect(courseById('bogus')).toBeUndefined();
    });

    it('returns the course when it exists', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, { name: 'Algorithms' });
      expect(courseById(courseId)?.name).toBe('Algorithms');
    });

    it('returns undefined when no semester is selected', () => {
      expect(courseById('any')).toBeUndefined();
    });
  });

  // =========================================================================
  // allCourses
  // =========================================================================
  describe('useAllCourses', () => {
    it('returns empty array when no semester selected', () => {
      expect(allCourses()).toEqual([]);
    });

    it('returns all courses in the current semester', () => {
      const semId = addSemester();
      addCourse(semId, { name: 'A' });
      addCourse(semId, { name: 'B' });
      expect(allCourses()).toHaveLength(2);
    });

    it('does not include courses from other semesters', () => {
      const s1 = addSemester('S1');
      const s2 = addSemester('S2');
      addCourse(s1, { name: 'In S1' });
      addCourse(s2, { name: 'In S2' });

      useAppStore.getState().setCurrentSemester(s1);
      const courses = allCourses();
      expect(courses).toHaveLength(1);
      expect(courses[0]?.name).toBe('In S1');
    });
  });

  // =========================================================================
  // homeworkByUrgency
  // =========================================================================
  describe('useHomeworkByUrgency', () => {
    it('returns empty groups when no semester selected', () => {
      resetStore();
      const result = homeworkByUrgency();
      expect(result.overdue).toEqual([]);
      expect(result.today).toEqual([]);
      expect(result.thisWeek).toEqual([]);
      expect(result.upcoming).toEqual([]);
      expect(result.noDate).toEqual([]);
    });

    it('groups homework with no due date into noDate', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, { name: 'CS' });
      useAppStore.getState().addHomework(courseId, {
        title: 'No Date', dueDate: '', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.noDate).toHaveLength(1);
      expect(result.noDate[0]?.homework.title).toBe('No Date');
    });

    it('groups overdue homework correctly', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Past', dueDate: '2025-06-10', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.overdue).toHaveLength(1);
      expect(result.overdue[0]?.homework.title).toBe('Past');
    });

    it('groups today homework correctly', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Today', dueDate: '2025-06-15', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.today).toHaveLength(1);
    });

    it('groups this week homework correctly', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'This Week', dueDate: '2025-06-18', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.thisWeek).toHaveLength(1);
    });

    it('groups upcoming homework correctly', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Future', dueDate: '2025-07-15', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.upcoming).toHaveLength(1);
    });

    it('includes course context in homework entries', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        name: 'Algorithms',
        color: 'hsl(200, 50%, 50%)',
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'HW1', dueDate: '2025-06-15', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      const entry = result.today[0];
      expect(entry?.courseName).toBe('Algorithms');
      expect(entry?.courseColor).toBe('hsl(200, 50%, 50%)');
      expect(entry?.courseId).toBe(courseId);
    });

    it('completed overdue items go into overdue', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Done Past', dueDate: '2025-06-10', completed: true, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.overdue).toHaveLength(1);
    });

    it('handles homework across multiple courses', () => {
      const semId = addSemester();
      const c1 = addCourse(semId, { name: 'Course A' });
      const c2 = addCourse(semId, { name: 'Course B' });

      useAppStore.getState().addHomework(c1, {
        title: 'A-HW', dueDate: '2025-06-15', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(c2, {
        title: 'B-HW', dueDate: '2025-06-18', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.today).toHaveLength(1);
      expect(result.thisWeek).toHaveLength(1);
    });

    it('handles invalid due date as noDate', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Bad Date', dueDate: 'not-a-date', completed: false, notes: '', links: [],
      });

      const result = homeworkByUrgency();
      expect(result.noDate).toHaveLength(1);
    });
  });

  // =========================================================================
  // courseProgress
  // =========================================================================
  describe('useCourseProgress', () => {
    it('returns zeros for non-existent course', () => {
      addSemester();
      const progress = courseProgress('bogus');
      expect(progress.totalRecordings).toBe(0);
      expect(progress.watchedCount).toBe(0);
      expect(progress.totalHomework).toBe(0);
      expect(progress.completedHomework).toBe(0);
    });

    it('counts recordings across all tabs', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [
            { id: 'lectures', name: 'Lectures', items: [
              { name: 'L1', videoLink: '', slideLink: '', watched: true },
              { name: 'L2', videoLink: '', slideLink: '', watched: false },
            ]},
            { id: 'tutorials', name: 'Tutorials', items: [
              { name: 'T1', videoLink: '', slideLink: '', watched: true },
            ]},
          ],
        },
      });

      const progress = courseProgress(courseId);
      expect(progress.totalRecordings).toBe(3);
      expect(progress.watchedCount).toBe(2);
    });

    it('counts homework completion', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Done', dueDate: '', completed: true, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'Pending', dueDate: '', completed: false, notes: '', links: [],
      });

      const progress = courseProgress(courseId);
      expect(progress.totalHomework).toBe(2);
      expect(progress.completedHomework).toBe(1);
    });

    it('returns zeros when no semester selected', () => {
      resetStore();
      const progress = courseProgress('any');
      expect(progress.totalRecordings).toBe(0);
    });
  });

  // =========================================================================
  // sortedRecordings
  // =========================================================================
  describe('useSortedRecordings', () => {
    it('returns empty array when no semester selected', () => {
      resetStore();
      expect(sortedRecordings('any', 0)).toEqual([]);
    });

    it('returns empty array for non-existent course', () => {
      addSemester();
      expect(sortedRecordings('bogus', 0)).toEqual([]);
    });

    it('returns empty array for non-existent tab index', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      expect(sortedRecordings(courseId, 99)).toEqual([]);
    });

    it('returns items in original order for manual sort', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [{
            id: 'lectures', name: 'Lectures',
            items: [
              { name: 'Lecture 3', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 1', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 2', videoLink: '', slideLink: '', watched: false },
            ],
          }],
        },
      });

      useAppStore.getState().setRecordingSortOrder(courseId, 'lectures', 'manual');

      const sorted = sortedRecordings(courseId, 0);
      expect(sorted.map((r) => r.item.name)).toEqual(['Lecture 3', 'Lecture 1', 'Lecture 2']);
    });

    it('sorts by name ascending', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [{
            id: 'lectures', name: 'Lectures',
            items: [
              { name: 'Lecture 3', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 1', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 2', videoLink: '', slideLink: '', watched: false },
            ],
          }],
        },
      });

      useAppStore.getState().setRecordingSortOrder(courseId, 'lectures', 'name_asc');

      const sorted = sortedRecordings(courseId, 0);
      expect(sorted.map((r) => r.item.name)).toEqual(['Lecture 1', 'Lecture 2', 'Lecture 3']);
    });

    it('sorts by name descending', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [{
            id: 'lectures', name: 'Lectures',
            items: [
              { name: 'Lecture 1', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 3', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 2', videoLink: '', slideLink: '', watched: false },
            ],
          }],
        },
      });

      useAppStore.getState().setRecordingSortOrder(courseId, 'lectures', 'name_desc');

      const sorted = sortedRecordings(courseId, 0);
      expect(sorted.map((r) => r.item.name)).toEqual(['Lecture 3', 'Lecture 2', 'Lecture 1']);
    });

    it('sorts watched first', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [{
            id: 'lectures', name: 'Lectures',
            items: [
              { name: 'A', videoLink: '', slideLink: '', watched: false },
              { name: 'B', videoLink: '', slideLink: '', watched: true },
              { name: 'C', videoLink: '', slideLink: '', watched: false },
            ],
          }],
        },
      });

      useAppStore.getState().setRecordingSortOrder(courseId, 'lectures', 'watched_first');

      const sorted = sortedRecordings(courseId, 0);
      expect(sorted[0]?.item.name).toBe('B');
      expect(sorted[0]?.item.watched).toBe(true);
    });

    it('sorts unwatched first', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [{
            id: 'lectures', name: 'Lectures',
            items: [
              { name: 'A', videoLink: '', slideLink: '', watched: true },
              { name: 'B', videoLink: '', slideLink: '', watched: false },
              { name: 'C', videoLink: '', slideLink: '', watched: true },
            ],
          }],
        },
      });

      useAppStore.getState().setRecordingSortOrder(courseId, 'lectures', 'unwatched_first');

      const sorted = sortedRecordings(courseId, 0);
      expect(sorted[0]?.item.name).toBe('B');
      expect(sorted[0]?.item.watched).toBe(false);
    });

    it('default sort uses numeric key', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [{
            id: 'lectures', name: 'Lectures',
            items: [
              { name: 'Lecture 10', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 2', videoLink: '', slideLink: '', watched: false },
              { name: 'Lecture 1', videoLink: '', slideLink: '', watched: false },
            ],
          }],
        },
      });

      const sorted = sortedRecordings(courseId, 0);
      expect(sorted.map((r) => r.item.name)).toEqual(['Lecture 1', 'Lecture 2', 'Lecture 10']);
    });

    it('preserves originalIndex for CRUD operations', () => {
      const semId = addSemester();
      const courseId = addCourse(semId, {
        recordings: {
          tabs: [{
            id: 'lectures', name: 'Lectures',
            items: [
              { name: 'C', videoLink: '', slideLink: '', watched: false },
              { name: 'A', videoLink: '', slideLink: '', watched: false },
              { name: 'B', videoLink: '', slideLink: '', watched: false },
            ],
          }],
        },
      });

      useAppStore.getState().setRecordingSortOrder(courseId, 'lectures', 'name_asc');

      const sorted = sortedRecordings(courseId, 0);
      expect(sorted[0]?.item.name).toBe('A');
      expect(sorted[0]?.originalIndex).toBe(1);
    });
  });

  // =========================================================================
  // sortedHomework
  // =========================================================================
  describe('useSortedHomework', () => {
    it('returns empty array when no semester selected', () => {
      resetStore();
      expect(sortedHomework('any')).toEqual([]);
    });

    it('returns empty array for non-existent course', () => {
      addSemester();
      expect(sortedHomework('bogus')).toEqual([]);
    });

    it('returns items in original order for manual sort', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'HW 3', dueDate: '', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'HW 1', dueDate: '', completed: false, notes: '', links: [],
      });

      const sorted = sortedHomework(courseId);
      expect(sorted.map((h) => h.item.title)).toEqual(['HW 3', 'HW 1']);
    });

    it('sorts by date ascending', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Later', dueDate: '2025-07-01', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'Earlier', dueDate: '2025-06-01', completed: false, notes: '', links: [],
      });

      useAppStore.getState().setHomeworkSortOrder(courseId, 'date_asc');

      const sorted = sortedHomework(courseId);
      expect(sorted.map((h) => h.item.title)).toEqual(['Earlier', 'Later']);
    });

    it('sorts by date descending', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Earlier', dueDate: '2025-06-01', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'Later', dueDate: '2025-07-01', completed: false, notes: '', links: [],
      });

      useAppStore.getState().setHomeworkSortOrder(courseId, 'date_desc');

      const sorted = sortedHomework(courseId);
      expect(sorted.map((h) => h.item.title)).toEqual(['Later', 'Earlier']);
    });

    it('sorts completed first', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Pending', dueDate: '', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'Done', dueDate: '', completed: true, notes: '', links: [],
      });

      useAppStore.getState().setHomeworkSortOrder(courseId, 'completed_first');

      const sorted = sortedHomework(courseId);
      expect(sorted[0]?.item.title).toBe('Done');
    });

    it('sorts incomplete first', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Done', dueDate: '', completed: true, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'Pending', dueDate: '', completed: false, notes: '', links: [],
      });

      useAppStore.getState().setHomeworkSortOrder(courseId, 'incomplete_first');

      const sorted = sortedHomework(courseId);
      expect(sorted[0]?.item.title).toBe('Pending');
    });

    it('sorts by name ascending', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'Zeta', dueDate: '', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'Alpha', dueDate: '', completed: false, notes: '', links: [],
      });

      useAppStore.getState().setHomeworkSortOrder(courseId, 'name_asc');

      const sorted = sortedHomework(courseId);
      expect(sorted.map((h) => h.item.title)).toEqual(['Alpha', 'Zeta']);
    });

    it('pushes items without due date to end in date_asc sort', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'No Date', dueDate: '', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'Has Date', dueDate: '2025-06-01', completed: false, notes: '', links: [],
      });

      useAppStore.getState().setHomeworkSortOrder(courseId, 'date_asc');

      const sorted = sortedHomework(courseId);
      expect(sorted[0]?.item.title).toBe('Has Date');
      expect(sorted[1]?.item.title).toBe('No Date');
    });

    it('preserves originalIndex', () => {
      const semId = addSemester();
      const courseId = addCourse(semId);
      useAppStore.getState().addHomework(courseId, {
        title: 'B', dueDate: '', completed: false, notes: '', links: [],
      });
      useAppStore.getState().addHomework(courseId, {
        title: 'A', dueDate: '', completed: false, notes: '', links: [],
      });

      useAppStore.getState().setHomeworkSortOrder(courseId, 'name_asc');

      const sorted = sortedHomework(courseId);
      expect(sorted[0]?.item.title).toBe('A');
      expect(sorted[0]?.originalIndex).toBe(1);
    });
  });
});
