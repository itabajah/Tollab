/**
 * Integration tests: Semester management → store state verification.
 *
 * Exercises addSemester, deleteSemester, setCurrentSemester,
 * renameSemester and verifies cascading effects.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '@/store/app-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getState() {
  return useAppStore.getState();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  useAppStore.setState({
    semesters: [],
    currentSemesterId: null,
    settings: getState().settings,
    lastModified: new Date().toISOString(),
    recordingSortOrders: {},
    homeworkSortOrders: {},
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Semester management integration', () => {
  it('adds a semester and sets it as current when first', () => {
    const id = getState().addSemester('Winter 2025');

    expect(getState().semesters).toHaveLength(1);
    expect(getState().semesters[0]!.id).toBe(id);
    expect(getState().semesters[0]!.name).toBe('Winter 2025');
    expect(getState().currentSemesterId).toBe(id);
  });

  it('adds a second semester without changing current', () => {
    const first = getState().addSemester('Winter 2025');
    const second = getState().addSemester('Spring 2025');

    expect(getState().semesters).toHaveLength(2);
    expect(getState().currentSemesterId).toBe(first);
    expect(getState().semesters[1]!.id).toBe(second);
  });

  it('switches current semester', () => {
    const first = getState().addSemester('Winter 2025');
    const second = getState().addSemester('Spring 2025');

    getState().setCurrentSemester(second);
    expect(getState().currentSemesterId).toBe(second);

    getState().setCurrentSemester(first);
    expect(getState().currentSemesterId).toBe(first);
  });

  it('ignores switch to non-existent semester', () => {
    const id = getState().addSemester('Winter 2025');
    getState().setCurrentSemester('non-existent');
    expect(getState().currentSemesterId).toBe(id);
  });

  it('deletes a semester and removes its courses from state', () => {
    const semId = getState().addSemester('Winter 2025');
    const courseId = getState().addCourse(semId, {
      name: 'Intro CS',
      number: '234111',
      points: '3.0',
      lecturer: '',
      faculty: '',
      location: '',
      grade: '',
      color: 'hsl(0,50%,50%)',
      syllabus: '',
      notes: '',
      exams: { moedA: '', moedB: '' },
      schedule: [],
      homework: [],
      recordings: { tabs: [] },
    });

    getState().setRecordingSortOrder(courseId, 'lectures', 'name_asc');
    getState().setHomeworkSortOrder(courseId, 'date_asc');

    getState().deleteSemester(semId);

    expect(getState().semesters).toHaveLength(0);
    expect(getState().currentSemesterId).toBeNull();
    // Sort orders cleaned up
    expect(getState().recordingSortOrders[courseId]).toBeUndefined();
    expect(getState().homeworkSortOrders[courseId]).toBeUndefined();
  });

  it('deletes current semester and falls back to first remaining', () => {
    const first = getState().addSemester('Winter 2025');
    const second = getState().addSemester('Spring 2025');

    getState().setCurrentSemester(first);
    getState().deleteSemester(first);

    expect(getState().currentSemesterId).toBe(second);
    expect(getState().semesters).toHaveLength(1);
  });

  it('renames a semester', () => {
    const id = getState().addSemester('Winter 2025');
    getState().renameSemester(id, 'Fall 2025');

    expect(getState().semesters[0]!.name).toBe('Fall 2025');
  });

  it('new semesters get default calendar settings', () => {
    const id = getState().addSemester('Winter 2025');
    const sem = getState().semesters.find((s) => s.id === id);

    expect(sem!.calendarSettings).toBeDefined();
    expect(sem!.calendarSettings.startHour).toBe(8);
    expect(sem!.calendarSettings.endHour).toBe(20);
  });

  it('updates calendar settings for a specific semester', () => {
    const id = getState().addSemester('Winter 2025');

    getState().updateCalendarSettings(id, { startHour: 9, endHour: 22 });

    const sem = getState().semesters.find((s) => s.id === id)!;
    expect(sem.calendarSettings.startHour).toBe(9);
    expect(sem.calendarSettings.endHour).toBe(22);
  });
});
