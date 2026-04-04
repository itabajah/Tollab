/**
 * Main application Zustand store.
 *
 * Replaces the legacy global `appData` object with a typed, immutable store.
 * All mutations use the immer middleware for clean deeply-nested updates.
 *
 * Side effects (localStorage, Firebase) are NOT handled here — they will be
 * wired via middleware or subscribers in a later wave.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { DEFAULT_CALENDAR_SETTINGS, DEFAULT_RECORDING_TABS, DEFAULT_THEME_SETTINGS } from '@/constants';
import type {
  AppSettings,
  CalendarSettings,
  Course,
  Homework,
  RecordingItem,
  RecordingSortOrder,
  ScheduleSlot,
  Semester,
} from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID();
}

/** Build a default recordings structure for a new course. */
function defaultRecordings(): Course['recordings'] {
  return {
    tabs: DEFAULT_RECORDING_TABS.map((t) => ({ ...t, items: [] })),
  };
}

// ---------------------------------------------------------------------------
// State & action types
// ---------------------------------------------------------------------------

interface AppState {
  semesters: Semester[];
  currentSemesterId: string | null;
  settings: AppSettings;
  lastModified: string;
  /** Per-course, per-tab recording sort orders. */
  recordingSortOrders: Record<string, Record<string, RecordingSortOrder>>;
  /** Per-course homework sort orders. */
  homeworkSortOrders: Record<string, string>;
}

interface AppActions {
  // -- Semester CRUD --------------------------------------------------------
  addSemester: (name: string) => string;
  deleteSemester: (id: string) => void;
  setCurrentSemester: (id: string) => void;
  renameSemester: (id: string, name: string) => void;

  // -- Course CRUD ----------------------------------------------------------
  addCourse: (semesterId: string, course: Omit<Course, 'id'>) => string;
  updateCourse: (
    semesterId: string,
    courseId: string,
    updates: Partial<Course>,
  ) => void;
  deleteCourse: (semesterId: string, courseId: string) => void;
  moveCourse: (
    courseId: string,
    fromSemesterId: string,
    toSemesterId: string,
  ) => void;
  reorderCourse: (
    semesterId: string,
    courseIndex: number,
    direction: 'up' | 'down',
  ) => void;

  // -- Recording Tab CRUD ---------------------------------------------------
  addRecordingTab: (courseId: string, name: string) => string;
  renameRecordingTab: (
    courseId: string,
    tabId: string,
    name: string,
  ) => void;
  deleteRecordingTab: (courseId: string, tabId: string) => void;
  clearRecordingTab: (courseId: string, tabId: string) => void;

  // -- Recording Item CRUD --------------------------------------------------
  addRecording: (
    courseId: string,
    tabId: string,
    recording: RecordingItem,
  ) => void;
  updateRecording: (
    courseId: string,
    tabId: string,
    index: number,
    updates: Partial<RecordingItem>,
  ) => void;
  deleteRecording: (
    courseId: string,
    tabId: string,
    index: number,
  ) => void;
  toggleRecordingWatched: (
    courseId: string,
    tabId: string,
    index: number,
  ) => void;
  reorderRecording: (
    courseId: string,
    tabId: string,
    index: number,
    direction: 'up' | 'down',
  ) => void;
  setRecordingSortOrder: (
    courseId: string,
    tabId: string,
    order: RecordingSortOrder,
  ) => void;

  // -- Homework CRUD --------------------------------------------------------
  addHomework: (courseId: string, homework: Homework) => void;
  updateHomework: (
    courseId: string,
    hwIndex: number,
    updates: Partial<Homework>,
  ) => void;
  deleteHomework: (courseId: string, hwIndex: number) => void;
  toggleHomeworkCompleted: (courseId: string, hwIndex: number) => void;

  // -- Schedule -------------------------------------------------------------
  addScheduleSlot: (courseId: string, slot: ScheduleSlot) => void;
  updateScheduleSlot: (
    courseId: string,
    slotIndex: number,
    updates: Partial<ScheduleSlot>,
  ) => void;
  deleteScheduleSlot: (courseId: string, slotIndex: number) => void;

  // -- Settings -------------------------------------------------------------
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateCalendarSettings: (
    semesterId: string,
    updates: Partial<CalendarSettings>,
  ) => void;

  // -- Bulk -----------------------------------------------------------------
  importSemester: (semester: Semester) => void;
  importCourses: (semesterId: string, courses: Course[]) => void;

  // -- Persistence ----------------------------------------------------------
  saveData: () => void;
  loadData: (data: {
    semesters: Semester[];
    settings: AppSettings;
    currentSemesterId?: string | null;
    lastModified?: string;
    recordingSortOrders?: Record<string, Record<string, RecordingSortOrder>>;
    homeworkSortOrders?: Record<string, string>;
  }) => void;
}

export type AppStore = AppState & AppActions;

// ---------------------------------------------------------------------------
// Immer-powered helpers (operate on the draft inside set())
// ---------------------------------------------------------------------------

/** Find a course across all semesters in the draft. */
function findCourseDraft(
  semesters: Semester[],
  courseId: string,
): Course | undefined {
  for (const semester of semesters) {
    const course = semester.courses.find((c) => c.id === courseId);
    if (course) return course;
  }
  return undefined;
}

/** Find a recording tab within a course draft. */
function findTabDraft(
  course: Course,
  tabId: string,
) {
  return course.recordings.tabs.find((t) => t.id === tabId);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppStore>()(
  immer((set) => ({
    // -- Initial state ------------------------------------------------------
    semesters: [],
    currentSemesterId: null,
    settings: { ...DEFAULT_THEME_SETTINGS },
    lastModified: new Date().toISOString(),
    recordingSortOrders: {},
    homeworkSortOrders: {},

    // ======================================================================
    // Semester CRUD
    // ======================================================================

    addSemester: (name) => {
      const id = generateId();
      set((state) => {
        state.semesters.push({
          id,
          name,
          courses: [],
          calendarSettings: { ...DEFAULT_CALENDAR_SETTINGS },
        });
        if (state.currentSemesterId === null) {
          state.currentSemesterId = id;
        }
      });
      return id;
    },

    deleteSemester: (id) => {
      set((state) => {
        const idx = state.semesters.findIndex((s) => s.id === id);
        if (idx === -1) return;
        state.semesters.splice(idx, 1);

        // Clean up sort orders for courses in the deleted semester
        const semester = state.semesters[idx];
        if (semester) {
          for (const course of semester.courses) {
            delete state.recordingSortOrders[course.id];
            delete state.homeworkSortOrders[course.id];
          }
        }

        if (state.currentSemesterId === id) {
          state.currentSemesterId = state.semesters[0]?.id ?? null;
        }
      });
    },

    setCurrentSemester: (id) => {
      set((state) => {
        if (state.semesters.some((s) => s.id === id)) {
          state.currentSemesterId = id;
        }
      });
    },

    renameSemester: (id, name) => {
      set((state) => {
        const semester = state.semesters.find((s) => s.id === id);
        if (semester) {
          semester.name = name;
        }
      });
    },

    // ======================================================================
    // Course CRUD
    // ======================================================================

    addCourse: (semesterId, course) => {
      const id = generateId();
      set((state) => {
        const semester = state.semesters.find((s) => s.id === semesterId);
        if (!semester) return;
        semester.courses.push({
          ...course,
          id,
          homework: course.homework ?? [],
          recordings: course.recordings ?? defaultRecordings(),
          schedule: course.schedule ?? [],
          exams: course.exams ?? { moedA: '', moedB: '' },
        });
      });
      return id;
    },

    updateCourse: (semesterId, courseId, updates) => {
      set((state) => {
        const semester = state.semesters.find((s) => s.id === semesterId);
        if (!semester) return;
        const course = semester.courses.find((c) => c.id === courseId);
        if (!course) return;
        Object.assign(course, updates);
        // Preserve the id — never overwrite
        course.id = courseId;
      });
    },

    deleteCourse: (semesterId, courseId) => {
      set((state) => {
        const semester = state.semesters.find((s) => s.id === semesterId);
        if (!semester) return;
        semester.courses = semester.courses.filter((c) => c.id !== courseId);
        delete state.recordingSortOrders[courseId];
        delete state.homeworkSortOrders[courseId];
      });
    },

    moveCourse: (courseId, fromSemesterId, toSemesterId) => {
      set((state) => {
        const from = state.semesters.find((s) => s.id === fromSemesterId);
        const to = state.semesters.find((s) => s.id === toSemesterId);
        if (!from || !to) return;

        const idx = from.courses.findIndex((c) => c.id === courseId);
        if (idx === -1) return;

        const course = from.courses[idx];
        if (!course) return;
        from.courses.splice(idx, 1);
        to.courses.push(course);
      });
    },

    reorderCourse: (semesterId, courseIndex, direction) => {
      set((state) => {
        const semester = state.semesters.find((s) => s.id === semesterId);
        if (!semester) return;

        const newIndex =
          direction === 'up' ? courseIndex - 1 : courseIndex + 1;
        if (newIndex < 0 || newIndex >= semester.courses.length) return;

        const a = semester.courses[courseIndex];
        const b = semester.courses[newIndex];
        if (!a || !b) return;
        semester.courses[courseIndex] = b;
        semester.courses[newIndex] = a;
      });
    },

    // ======================================================================
    // Recording Tab CRUD
    // ======================================================================

    addRecordingTab: (courseId, name) => {
      const tabId = `custom_${generateId()}`;
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        course.recordings.tabs.push({ id: tabId, name, items: [] });
      });
      return tabId;
    },

    renameRecordingTab: (courseId, tabId, name) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const tab = findTabDraft(course, tabId);
        if (tab) tab.name = name;
      });
    },

    deleteRecordingTab: (courseId, tabId) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        course.recordings.tabs = course.recordings.tabs.filter(
          (t) => t.id !== tabId,
        );
        // Clean up sort order for this tab
        const courseOrders = state.recordingSortOrders[courseId];
        if (courseOrders) {
          delete courseOrders[tabId];
        }
      });
    },

    clearRecordingTab: (courseId, tabId) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const tab = findTabDraft(course, tabId);
        if (tab) tab.items = [];
      });
    },

    // ======================================================================
    // Recording Item CRUD
    // ======================================================================

    addRecording: (courseId, tabId, recording) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const tab = findTabDraft(course, tabId);
        if (tab) tab.items.push({ ...recording });
      });
    },

    updateRecording: (courseId, tabId, index, updates) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const tab = findTabDraft(course, tabId);
        const item = tab?.items[index];
        if (item) Object.assign(item, updates);
      });
    },

    deleteRecording: (courseId, tabId, index) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const tab = findTabDraft(course, tabId);
        if (tab && index >= 0 && index < tab.items.length) {
          tab.items.splice(index, 1);
        }
      });
    },

    toggleRecordingWatched: (courseId, tabId, index) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const tab = findTabDraft(course, tabId);
        const item = tab?.items[index];
        if (item) item.watched = !item.watched;
      });
    },

    reorderRecording: (courseId, tabId, index, direction) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const tab = findTabDraft(course, tabId);
        if (!tab) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= tab.items.length) return;

        const a = tab.items[index];
        const b = tab.items[newIndex];
        if (!a || !b) return;
        tab.items[index] = b;
        tab.items[newIndex] = a;

        // Reordering implies manual sort
        if (!state.recordingSortOrders[courseId]) {
          state.recordingSortOrders[courseId] = {};
        }
        state.recordingSortOrders[courseId]![tabId] = 'manual';
      });
    },

    setRecordingSortOrder: (courseId, tabId, order) => {
      set((state) => {
        if (!state.recordingSortOrders[courseId]) {
          state.recordingSortOrders[courseId] = {};
        }
        state.recordingSortOrders[courseId]![tabId] = order;
      });
    },

    // ======================================================================
    // Homework CRUD
    // ======================================================================

    addHomework: (courseId, homework) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        course.homework.push({ ...homework });
      });
    },

    updateHomework: (courseId, hwIndex, updates) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const hw = course.homework[hwIndex];
        if (hw) Object.assign(hw, updates);
      });
    },

    deleteHomework: (courseId, hwIndex) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        if (hwIndex >= 0 && hwIndex < course.homework.length) {
          course.homework.splice(hwIndex, 1);
        }
      });
    },

    toggleHomeworkCompleted: (courseId, hwIndex) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const hw = course.homework[hwIndex];
        if (hw) hw.completed = !hw.completed;
      });
    },

    // ======================================================================
    // Schedule
    // ======================================================================

    addScheduleSlot: (courseId, slot) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        course.schedule.push({ ...slot });
      });
    },

    updateScheduleSlot: (courseId, slotIndex, updates) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        const slot = course.schedule[slotIndex];
        if (slot) Object.assign(slot, updates);
      });
    },

    deleteScheduleSlot: (courseId, slotIndex) => {
      set((state) => {
        const course = findCourseDraft(state.semesters, courseId);
        if (!course) return;
        if (slotIndex >= 0 && slotIndex < course.schedule.length) {
          course.schedule.splice(slotIndex, 1);
        }
      });
    },

    // ======================================================================
    // Settings
    // ======================================================================

    updateSettings: (updates) => {
      set((state) => {
        Object.assign(state.settings, updates);
      });
    },

    updateCalendarSettings: (semesterId, updates) => {
      set((state) => {
        const semester = state.semesters.find((s) => s.id === semesterId);
        if (!semester) return;
        Object.assign(semester.calendarSettings, updates);
      });
    },

    // ======================================================================
    // Bulk (ICS / Cheesefork import)
    // ======================================================================

    importSemester: (semester) => {
      set((state) => {
        const existing = state.semesters.find((s) => s.id === semester.id);
        if (existing) {
          existing.name = semester.name;
          existing.courses = semester.courses;
          existing.calendarSettings = semester.calendarSettings;
        } else {
          state.semesters.push(semester);
        }
        state.currentSemesterId = semester.id;
      });
    },

    importCourses: (semesterId, courses) => {
      set((state) => {
        const semester = state.semesters.find((s) => s.id === semesterId);
        if (!semester) return;

        for (const imported of courses) {
          const existing = semester.courses.find(
            (c) =>
              (c.number && c.number === imported.number) ||
              c.name === imported.name,
          );

          if (existing) {
            // Merge: update exam dates if the imported course has them
            if (imported.exams.moedA) existing.exams.moedA = imported.exams.moedA;
            if (imported.exams.moedB) existing.exams.moedB = imported.exams.moedB;
            // Merge schedule slots that don't already exist
            for (const slot of imported.schedule) {
              const dup = existing.schedule.some(
                (s) =>
                  s.day === slot.day &&
                  s.start === slot.start &&
                  s.end === slot.end,
              );
              if (!dup) existing.schedule.push(slot);
            }
          } else {
            semester.courses.push({
              ...imported,
              id: imported.id || generateId(),
              homework: imported.homework ?? [],
              recordings: imported.recordings ?? defaultRecordings(),
            });
          }
        }
      });
    },

    // ======================================================================
    // Persistence
    // ======================================================================

    saveData: () => {
      set((state) => {
        state.lastModified = new Date().toISOString();
      });
    },

    loadData: (data) => {
      set((state) => {
        state.semesters = data.semesters;
        state.settings = data.settings;
        state.lastModified = data.lastModified ?? new Date().toISOString();
        state.recordingSortOrders = data.recordingSortOrders ?? {};
        state.homeworkSortOrders = data.homeworkSortOrders ?? {};

        if (data.currentSemesterId !== undefined) {
          state.currentSemesterId = data.currentSemesterId ?? null;
        } else if (data.semesters.length > 0) {
          state.currentSemesterId = data.semesters[0]?.id ?? null;
        } else {
          state.currentSemesterId = null;
        }
      });
    },
  })),
);
