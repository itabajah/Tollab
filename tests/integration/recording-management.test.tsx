/**
 * Integration tests: Recording management → store state verification.
 *
 * Exercises recording item CRUD, tab CRUD, toggle watched, sort order,
 * and verifies store state reflects all mutations correctly.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '@/store/app-store';
import type { RecordingItem } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getState() {
  return useAppStore.getState();
}

function setupCourseWithTab(): { semId: string; courseId: string; tabId: string } {
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
    recordings: {
      tabs: [{ id: 'lectures', name: 'Lectures', items: [] }],
    },
  });
  return { semId, courseId, tabId: 'lectures' };
}

function getRecordingItems(courseId: string, tabId: string): RecordingItem[] {
  const state = getState();
  for (const sem of state.semesters) {
    const course = sem.courses.find((c) => c.id === courseId);
    if (course) {
      const tab = course.recordings.tabs.find((t) => t.id === tabId);
      return tab?.items ?? [];
    }
  }
  return [];
}

const sampleRecording: RecordingItem = {
  name: 'Lecture 1',
  videoLink: 'https://example.com/vid1',
  slideLink: 'https://example.com/slide1',
  watched: false,
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

describe('Recording item CRUD', () => {
  it('adds a recording to a tab and verifies in store', () => {
    const { courseId, tabId } = setupCourseWithTab();

    getState().addRecording(courseId, tabId, sampleRecording);

    const items = getRecordingItems(courseId, tabId);
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Lecture 1');
    expect(items[0]!.watched).toBe(false);
  });

  it('toggles watched state', () => {
    const { courseId, tabId } = setupCourseWithTab();
    getState().addRecording(courseId, tabId, sampleRecording);

    expect(getRecordingItems(courseId, tabId)[0]!.watched).toBe(false);

    getState().toggleRecordingWatched(courseId, tabId, 0);
    expect(getRecordingItems(courseId, tabId)[0]!.watched).toBe(true);

    getState().toggleRecordingWatched(courseId, tabId, 0);
    expect(getRecordingItems(courseId, tabId)[0]!.watched).toBe(false);
  });

  it('updates a recording item', () => {
    const { courseId, tabId } = setupCourseWithTab();
    getState().addRecording(courseId, tabId, sampleRecording);

    getState().updateRecording(courseId, tabId, 0, { name: 'Lecture 1 (Updated)' });

    expect(getRecordingItems(courseId, tabId)[0]!.name).toBe('Lecture 1 (Updated)');
  });

  it('deletes a recording item', () => {
    const { courseId, tabId } = setupCourseWithTab();
    getState().addRecording(courseId, tabId, sampleRecording);
    getState().addRecording(courseId, tabId, { ...sampleRecording, name: 'Lecture 2' });

    getState().deleteRecording(courseId, tabId, 0);

    const items = getRecordingItems(courseId, tabId);
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Lecture 2');
  });

  it('reorders recordings and sets sort to manual', () => {
    const { courseId, tabId } = setupCourseWithTab();
    getState().addRecording(courseId, tabId, { ...sampleRecording, name: 'Lecture 1' });
    getState().addRecording(courseId, tabId, { ...sampleRecording, name: 'Lecture 2' });

    getState().reorderRecording(courseId, tabId, 0, 'down');

    const items = getRecordingItems(courseId, tabId);
    expect(items[0]!.name).toBe('Lecture 2');
    expect(items[1]!.name).toBe('Lecture 1');
    expect(getState().recordingSortOrders[courseId]?.[tabId]).toBe('manual');
  });
});

describe('Recording sort orders', () => {
  it('sets and retrieves a recording sort order', () => {
    const { courseId, tabId } = setupCourseWithTab();

    getState().setRecordingSortOrder(courseId, tabId, 'name_asc');
    expect(getState().recordingSortOrders[courseId]?.[tabId]).toBe('name_asc');

    getState().setRecordingSortOrder(courseId, tabId, 'watched_first');
    expect(getState().recordingSortOrders[courseId]?.[tabId]).toBe('watched_first');
  });
});

describe('Recording tab CRUD', () => {
  it('adds a custom recording tab', () => {
    const { courseId } = setupCourseWithTab();

    const newTabId = getState().addRecordingTab(courseId, 'Supplementary');

    const state = getState();
    const course = state.semesters
      .flatMap((s) => s.courses)
      .find((c) => c.id === courseId)!;

    expect(course.recordings.tabs).toHaveLength(2);
    const newTab = course.recordings.tabs.find((t) => t.id === newTabId);
    expect(newTab).toBeDefined();
    expect(newTab!.name).toBe('Supplementary');
    expect(newTab!.items).toEqual([]);
  });

  it('renames a recording tab', () => {
    const { courseId } = setupCourseWithTab();
    const tabId = getState().addRecordingTab(courseId, 'Old Name');

    getState().renameRecordingTab(courseId, tabId, 'New Name');

    const course = getState().semesters
      .flatMap((s) => s.courses)
      .find((c) => c.id === courseId)!;
    const tab = course.recordings.tabs.find((t) => t.id === tabId);
    expect(tab!.name).toBe('New Name');
  });

  it('deletes a recording tab and cleans up sort orders', () => {
    const { courseId } = setupCourseWithTab();
    const tabId = getState().addRecordingTab(courseId, 'To Delete');

    getState().setRecordingSortOrder(courseId, tabId, 'name_desc');
    getState().deleteRecordingTab(courseId, tabId);

    const course = getState().semesters
      .flatMap((s) => s.courses)
      .find((c) => c.id === courseId)!;
    expect(course.recordings.tabs.find((t) => t.id === tabId)).toBeUndefined();
    expect(getState().recordingSortOrders[courseId]?.[tabId]).toBeUndefined();
  });

  it('clears all items in a recording tab', () => {
    const { courseId, tabId } = setupCourseWithTab();
    getState().addRecording(courseId, tabId, sampleRecording);
    getState().addRecording(courseId, tabId, { ...sampleRecording, name: 'Lecture 2' });

    getState().clearRecordingTab(courseId, tabId);

    expect(getRecordingItems(courseId, tabId)).toHaveLength(0);
  });
});
