/**
 * Tests for useTickerMessages hook — context-aware ticker message generation.
 *
 * Mocks the Zustand store and verifies ticker message generation for
 * different academic states (no semester, empty courses, classes, homework,
 * exams, recordings, time-of-day).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/preact';
import type { Semester, Course, Homework, ScheduleSlot, RecordingTab, RecordingItem } from '@/types';

// ---------------------------------------------------------------------------
// Store mock — must be set up before importing the hook
// ---------------------------------------------------------------------------

let mockSemesters: Semester[] = [];
let mockCurrentSemesterId = 'sem1';

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => {
    const state = {
      semesters: mockSemesters,
      currentSemesterId: mockCurrentSemesterId,
    };
    return selector(state);
  },
}));

// ---------------------------------------------------------------------------
// Import after mock
// ---------------------------------------------------------------------------

import { useTickerMessages, type TickerMessage } from '@/hooks/useTickerMessages';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: `course-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Test Course',
    number: '234111',
    points: '3.0',
    lecturer: 'Prof. Test',
    faculty: 'CS',
    location: 'Taub 2',
    grade: '',
    color: 'hsl(200, 45%, 50%)',
    syllabus: '',
    notes: '',
    exams: { moedA: '', moedB: '' },
    schedule: [],
    homework: [],
    recordings: { tabs: [] },
    ...overrides,
  };
}

function makeSemester(overrides: Partial<Semester> = {}): Semester {
  return {
    id: 'sem1',
    name: 'Winter 2024-2025',
    courses: [],
    calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
    ...overrides,
  };
}

function makeHomework(overrides: Partial<Homework> = {}): Homework {
  return {
    title: 'HW 1',
    completed: false,
    dueDate: '',
    links: [],
    notes: '',
    ...overrides,
  };
}

function makeScheduleSlot(day: number, start: string, end: string): ScheduleSlot {
  return { day, start, end };
}

function renderMessages(): TickerMessage[] {
  const { result } = renderHook(() => useTickerMessages());
  return result.current;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTickerMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSemesters = [];
    mockCurrentSemesterId = 'sem1';
  });

  // =========================================================================
  // Empty states
  // =========================================================================

  describe('empty states', () => {
    it('returns no_semester message when no semester exists', () => {
      mockSemesters = [];
      const messages = renderMessages();

      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages[0]!.badge).toBe('SETUP');
      expect(messages[0]!.key).toBe('no_semester');
    });

    it('returns no_semester when current semester ID is not found', () => {
      mockSemesters = [makeSemester({ id: 'other' })];
      mockCurrentSemesterId = 'nonexistent';
      const messages = renderMessages();

      expect(messages[0]!.key).toBe('no_semester');
    });

    it('returns no_courses message when semester has no courses', () => {
      mockSemesters = [makeSemester({ courses: [] })];
      const messages = renderMessages();

      expect(messages[0]!.badge).toBe('SETUP');
      expect(messages[0]!.key).toBe('no_courses');
    });
  });

  // =========================================================================
  // Schedule-related messages
  // =========================================================================

  describe('schedule messages', () => {
    it('shows no_schedule when courses have no schedule slots', () => {
      mockSemesters = [makeSemester({ courses: [makeCourse()] })];
      const messages = renderMessages();

      const noSchedule = messages.find((m) => m.key === 'no_schedule');
      expect(noSchedule).toBeDefined();
      expect(noSchedule!.badge).toBe('SETUP');
    });

    it('does not show no_schedule when schedule exists', () => {
      const now = new Date();
      const course = makeCourse({
        schedule: [makeScheduleSlot(now.getDay(), '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const noSchedule = messages.find((m) => m.key === 'no_schedule');
      expect(noSchedule).toBeUndefined();
    });
  });

  // =========================================================================
  // Homework messages
  // =========================================================================

  describe('homework messages', () => {
    it('generates hw_overdue for past-due homework', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dueDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        homework: [makeHomework({ dueDate, title: 'Late HW' })],
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const hwMsg = messages.find((m) => m.key.startsWith('hw:'));
      expect(hwMsg).toBeDefined();
      expect(hwMsg!.badge).toBe('HW!');
    });

    it('generates hw_today for homework due today', () => {
      const today = new Date();
      const dueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        homework: [makeHomework({ dueDate, title: 'Today HW' })],
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const hwMsg = messages.find((m) => m.key.startsWith('hw:'));
      expect(hwMsg).toBeDefined();
    });

    it('skips completed homework', () => {
      const today = new Date();
      const dueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        homework: [makeHomework({ dueDate, completed: true })],
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const hwMsg = messages.find((m) => m.key.startsWith('hw:'));
      expect(hwMsg).toBeUndefined();
    });

    it('generates hw_many when 6+ homework pending', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      const homeworks = Array.from({ length: 7 }, (_, i) =>
        makeHomework({ dueDate, title: `HW ${i}` }),
      );
      const course = makeCourse({
        homework: homeworks,
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const manyMsg = messages.find((m) => m.key.startsWith('hw_many:'));
      expect(manyMsg).toBeDefined();
      expect(manyMsg!.badge).toBe('HW+');
    });

    it('generates hw_nodate for homework without due date', () => {
      const course = makeCourse({
        homework: [makeHomework({ dueDate: '', title: 'No Date HW' })],
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const noDateMsg = messages.find((m) => m.key.startsWith('hw_nodate:'));
      expect(noDateMsg).toBeDefined();
    });

    it('generates hw_all_done when all homework is completed and no other urgent items', () => {
      const course = makeCourse({
        homework: [makeHomework({ completed: true })],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const doneMsg = messages.find((m) => m.key === 'hw_all_done');
      expect(doneMsg).toBeDefined();
      expect(doneMsg!.badge).toBe('NICE');
    });
  });

  // =========================================================================
  // Exam messages
  // =========================================================================

  describe('exam messages', () => {
    it('generates exam message for upcoming exam within 14 days', () => {
      const future = new Date();
      future.setDate(future.getDate() + 7);
      const examDate = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        exams: { moedA: examDate, moedB: '' },
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const examMsg = messages.find((m) => m.key.startsWith('exam:'));
      expect(examMsg).toBeDefined();
    });

    it('generates exam_today with EXAM!! badge', () => {
      const today = new Date();
      const examDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        exams: { moedA: examDate, moedB: '' },
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const examMsg = messages.find((m) => m.key.startsWith('exam:'));
      expect(examMsg).toBeDefined();
      expect(examMsg!.badge).toBe('EXAM!!');
    });

    it('ignores exams more than 14 days away', () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      const examDate = `${farFuture.getFullYear()}-${String(farFuture.getMonth() + 1).padStart(2, '0')}-${String(farFuture.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        exams: { moedA: examDate, moedB: '' },
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const examMsg = messages.find((m) => m.key.startsWith('exam:'));
      expect(examMsg).toBeUndefined();
    });

    it('ignores past exams', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      const examDate = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        exams: { moedA: examDate, moedB: '' },
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const examMsg = messages.find((m) => m.key.startsWith('exam:'));
      expect(examMsg).toBeUndefined();
    });
  });

  // =========================================================================
  // Recordings messages
  // =========================================================================

  describe('recordings messages', () => {
    it('generates recordings_backlog for unwatched recordings', () => {
      const items: RecordingItem[] = Array.from({ length: 5 }, (_, i) => ({
        name: `Rec ${i}`,
        videoLink: `https://video.test/${i}`,
        slideLink: '',
        watched: false,
      }));
      const tab: RecordingTab = { id: 'tab1', name: 'Lectures', items };
      const course = makeCourse({
        recordings: { tabs: [tab] },
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const recMsg = messages.find((m) => m.key.startsWith('recordings_backlog:'));
      expect(recMsg).toBeDefined();
      expect(recMsg!.badge).toBe('REC');
    });

    it('generates recordings_big for 10+ unwatched', () => {
      const items: RecordingItem[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Rec ${i}`,
        videoLink: `https://video.test/${i}`,
        slideLink: '',
        watched: false,
      }));
      const tab: RecordingTab = { id: 'tab1', name: 'Lectures', items };
      const course = makeCourse({
        recordings: { tabs: [tab] },
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const recMsg = messages.find((m) => m.key.startsWith('recordings_backlog:'));
      expect(recMsg).toBeDefined();
      expect(recMsg!.badge).toBe('REC!');
    });

    it('generates recordings_clear when all watched and no other urgent items', () => {
      const items: RecordingItem[] = [
        { name: 'Rec 1', videoLink: 'url', slideLink: '', watched: true },
      ];
      const tab: RecordingTab = { id: 'tab1', name: 'Lectures', items };
      const course = makeCourse({
        recordings: { tabs: [tab] },
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const clearMsg = messages.find((m) => m.key === 'recordings_clear');
      expect(clearMsg).toBeDefined();
      expect(clearMsg!.badge).toBe('NICE');
    });
  });

  // =========================================================================
  // General messages
  // =========================================================================

  describe('general messages', () => {
    it('generates general filler messages when few items', () => {
      const course = makeCourse();
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const generalMsg = messages.find(
        (m) => m.key.startsWith('general:') || m.key.startsWith('general_course_roast:'),
      );
      expect(generalMsg).toBeDefined();
    });

    it('all messages have non-empty text', () => {
      const course = makeCourse();
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      for (const msg of messages) {
        expect(msg.text.trim().length).toBeGreaterThan(0);
      }
    });

    it('all messages have badge and key', () => {
      const course = makeCourse({
        homework: [makeHomework()],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      for (const msg of messages) {
        expect(msg.badge).toBeTruthy();
        expect(msg.key).toBeTruthy();
      }
    });

    it('messages are sorted by priority (descending)', () => {
      // We can't check priority directly (internal), but we can verify
      // exam_today messages come before general ones
      const today = new Date();
      const examDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const course = makeCourse({
        exams: { moedA: examDate, moedB: '' },
        schedule: [makeScheduleSlot(1, '08:00', '10:00')],
      });
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      if (messages.length >= 2) {
        const examIdx = messages.findIndex((m) => m.key.startsWith('exam:'));
        const generalIdx = messages.findIndex((m) => m.key.startsWith('general'));
        if (examIdx !== -1 && generalIdx !== -1) {
          expect(examIdx).toBeLessThan(generalIdx);
        }
      }
    });

    it('deduplicates messages by key', () => {
      const course = makeCourse();
      mockSemesters = [makeSemester({ courses: [course] })];
      const messages = renderMessages();

      const keys = messages.map((m) => m.key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });
  });
});
