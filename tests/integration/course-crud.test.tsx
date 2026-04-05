/**
 * Integration tests: Course CRUD → store state verification.
 *
 * Exercises addCourse, updateCourse, deleteCourse, moveCourse actions
 * and verifies that selectors (getState) reflect the expected mutations.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '@/store/app-store';
import type { Course, Semester } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getState() {
  return useAppStore.getState();
}

function currentSemester(): Semester | undefined {
  const s = getState();
  return s.semesters.find((sem) => sem.id === s.currentSemesterId);
}

function courseById(courseId: string): Course | undefined {
  const sem = currentSemester();
  return sem?.courses.find((c) => c.id === courseId);
}

const baseCourse: Omit<Course, 'id'> = {
  name: 'Intro to CS',
  number: '234111',
  points: '3.0',
  lecturer: 'Dr. A',
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
};

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

describe('Course CRUD integration', () => {
  it('adds a course and reflects it in store state', () => {
    const semId = getState().addSemester('Winter 2025');
    const courseId = getState().addCourse(semId, baseCourse);

    const sem = currentSemester();
    expect(sem).toBeDefined();
    expect(sem!.courses).toHaveLength(1);
    expect(sem!.courses[0]!.id).toBe(courseId);
    expect(sem!.courses[0]!.name).toBe('Intro to CS');
  });

  it('updates a course and verifies selectors return new data', () => {
    const semId = getState().addSemester('Winter 2025');
    const courseId = getState().addCourse(semId, baseCourse);

    getState().updateCourse(semId, courseId, { name: 'Advanced CS', grade: '95' });

    const course = courseById(courseId);
    expect(course).toBeDefined();
    expect(course!.name).toBe('Advanced CS');
    expect(course!.grade).toBe('95');
    expect(course!.id).toBe(courseId);
  });

  it('preserves course id when updating', () => {
    const semId = getState().addSemester('Spring 2025');
    const courseId = getState().addCourse(semId, baseCourse);

    getState().updateCourse(semId, courseId, { id: 'hijacked-id', name: 'Changed' } as Partial<Course>);

    const course = courseById(courseId);
    expect(course!.id).toBe(courseId);
    expect(course!.name).toBe('Changed');
  });

  it('deletes a course and removes it from state', () => {
    const semId = getState().addSemester('Winter 2025');
    const c1 = getState().addCourse(semId, baseCourse);
    const c2 = getState().addCourse(semId, { ...baseCourse, name: 'Data Structures' });

    getState().deleteCourse(semId, c1);

    const sem = currentSemester();
    expect(sem!.courses).toHaveLength(1);
    expect(sem!.courses[0]!.id).toBe(c2);
  });

  it('cleans up sort orders when deleting a course', () => {
    const semId = getState().addSemester('Winter 2025');
    const courseId = getState().addCourse(semId, baseCourse);

    getState().setRecordingSortOrder(courseId, 'lectures', 'name_asc');
    getState().setHomeworkSortOrder(courseId, 'date_asc');
    expect(getState().recordingSortOrders[courseId]).toBeDefined();
    expect(getState().homeworkSortOrders[courseId]).toBeDefined();

    getState().deleteCourse(semId, courseId);

    expect(getState().recordingSortOrders[courseId]).toBeUndefined();
    expect(getState().homeworkSortOrders[courseId]).toBeUndefined();
  });

  it('moves a course between semesters and verifies both update', () => {
    const sem1 = getState().addSemester('Winter 2025');
    const sem2 = getState().addSemester('Spring 2025');
    const courseId = getState().addCourse(sem1, baseCourse);

    expect(getState().semesters.find((s) => s.id === sem1)!.courses).toHaveLength(1);
    expect(getState().semesters.find((s) => s.id === sem2)!.courses).toHaveLength(0);

    getState().moveCourse(courseId, sem1, sem2);

    expect(getState().semesters.find((s) => s.id === sem1)!.courses).toHaveLength(0);
    expect(getState().semesters.find((s) => s.id === sem2)!.courses).toHaveLength(1);
    expect(getState().semesters.find((s) => s.id === sem2)!.courses[0]!.id).toBe(courseId);
  });

  it('reorders courses within a semester', () => {
    const semId = getState().addSemester('Winter 2025');
    const c1 = getState().addCourse(semId, { ...baseCourse, name: 'Course A' });
    const c2 = getState().addCourse(semId, { ...baseCourse, name: 'Course B' });

    getState().reorderCourse(semId, 0, 'down');

    const sem = getState().semesters.find((s) => s.id === semId)!;
    expect(sem.courses[0]!.id).toBe(c2);
    expect(sem.courses[1]!.id).toBe(c1);
  });

  it('ignores add to non-existent semester', () => {
    getState().addCourse('fake-sem', baseCourse);
    expect(getState().semesters).toHaveLength(0);
  });

  it('adds multiple courses and retrieves them all', () => {
    const semId = getState().addSemester('Winter 2025');
    getState().addCourse(semId, { ...baseCourse, name: 'CS 1' });
    getState().addCourse(semId, { ...baseCourse, name: 'CS 2' });
    getState().addCourse(semId, { ...baseCourse, name: 'CS 3' });

    const sem = currentSemester();
    expect(sem!.courses).toHaveLength(3);
    expect(sem!.courses.map((c) => c.name)).toEqual(['CS 1', 'CS 2', 'CS 3']);
  });
});
