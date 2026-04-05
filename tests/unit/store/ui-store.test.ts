import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/store/ui-store';
import type { ScheduleSlot, HomeworkLink } from '@/types';

// ---------------------------------------------------------------------------
// Reset store before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  useUiStore.getState().resetUi();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ui-store', () => {
  // =========================================================================
  // Course modal
  // =========================================================================
  describe('openCourseModal / closeCourseModal', () => {
    it('sets editingCourseId when opening with a course ID', () => {
      useUiStore.getState().openCourseModal('course-1');
      expect(useUiStore.getState().editingCourseId).toBe('course-1');
    });

    it('sets editingCourseId to null when opening without an ID (create mode)', () => {
      useUiStore.getState().openCourseModal();
      expect(useUiStore.getState().editingCourseId).toBeNull();
    });

    it('resets temp state when opening', () => {
      // Setup some dirty temp state
      useUiStore.getState().setRecordingsTab(3);
      useUiStore.getState().setTempRecordingEdit({ tabIndex: 1, recordingIndex: 2 });
      useUiStore.getState().addTempScheduleSlot({ day: 0, start: '08:00', end: '10:00' });
      useUiStore.getState().addTempEditLink({ label: 'Link', url: 'http://x.com' });

      useUiStore.getState().openCourseModal('c1');

      const state = useUiStore.getState();
      expect(state.currentRecordingsTab).toBe(0);
      expect(state.tempRecordingEdit).toBeNull();
      expect(state.tempSchedule).toEqual([]);
      expect(state.tempEditLinks).toEqual([]);
    });

    it('clears all temp state on close', () => {
      useUiStore.getState().openCourseModal('c2');
      useUiStore.getState().setRecordingsTab(5);

      useUiStore.getState().closeCourseModal();

      const state = useUiStore.getState();
      expect(state.editingCourseId).toBeNull();
      expect(state.currentRecordingsTab).toBe(0);
      expect(state.tempSchedule).toEqual([]);
      expect(state.tempRecordingEdit).toBeNull();
      expect(state.tempEditLinks).toEqual([]);
    });
  });

  // =========================================================================
  // Modal stack
  // =========================================================================
  describe('modal stack', () => {
    it('pushes modals onto the stack', () => {
      useUiStore.getState().pushModal('modal-a');
      useUiStore.getState().pushModal('modal-b');
      expect(useUiStore.getState().modalStack).toEqual(['modal-a', 'modal-b']);
    });

    it('does not push duplicates', () => {
      useUiStore.getState().pushModal('modal-a');
      useUiStore.getState().pushModal('modal-a');
      expect(useUiStore.getState().modalStack).toEqual(['modal-a']);
    });

    it('pops the most recent modal', () => {
      useUiStore.getState().pushModal('a');
      useUiStore.getState().pushModal('b');
      useUiStore.getState().popModal();
      expect(useUiStore.getState().modalStack).toEqual(['a']);
    });

    it('popping an empty stack does not throw', () => {
      expect(() => useUiStore.getState().popModal()).not.toThrow();
      expect(useUiStore.getState().modalStack).toEqual([]);
    });

    it('clearModals empties the stack', () => {
      useUiStore.getState().pushModal('x');
      useUiStore.getState().pushModal('y');
      useUiStore.getState().clearModals();
      expect(useUiStore.getState().modalStack).toEqual([]);
    });
  });

  // =========================================================================
  // editingCourseId set/clear
  // =========================================================================
  describe('editingCourseId', () => {
    it('starts as null', () => {
      expect(useUiStore.getState().editingCourseId).toBeNull();
    });

    it('is set on open and cleared on close', () => {
      useUiStore.getState().openCourseModal('abc');
      expect(useUiStore.getState().editingCourseId).toBe('abc');

      useUiStore.getState().closeCourseModal();
      expect(useUiStore.getState().editingCourseId).toBeNull();
    });
  });

  // =========================================================================
  // Tab switching
  // =========================================================================
  describe('setRecordingsTab', () => {
    it('changes the active recordings tab', () => {
      useUiStore.getState().setRecordingsTab(2);
      expect(useUiStore.getState().currentRecordingsTab).toBe(2);
    });

    it('starts at 0', () => {
      expect(useUiStore.getState().currentRecordingsTab).toBe(0);
    });
  });

  // =========================================================================
  // Temp recording edit
  // =========================================================================
  describe('setTempRecordingEdit', () => {
    it('sets the recording being edited', () => {
      useUiStore.getState().setTempRecordingEdit({ tabIndex: 1, recordingIndex: 3 });
      expect(useUiStore.getState().tempRecordingEdit).toEqual({
        tabIndex: 1,
        recordingIndex: 3,
      });
    });

    it('clears the recording edit with null', () => {
      useUiStore.getState().setTempRecordingEdit({ tabIndex: 0, recordingIndex: 0 });
      useUiStore.getState().setTempRecordingEdit(null);
      expect(useUiStore.getState().tempRecordingEdit).toBeNull();
    });
  });

  // =========================================================================
  // Temp schedule management
  // =========================================================================
  describe('temp schedule', () => {
    const slot1: ScheduleSlot = { day: 0, start: '08:00', end: '10:00' };
    const slot2: ScheduleSlot = { day: 2, start: '14:00', end: '16:00' };

    it('setTempSchedule replaces the entire schedule', () => {
      useUiStore.getState().setTempSchedule([slot1, slot2]);
      expect(useUiStore.getState().tempSchedule).toHaveLength(2);
    });

    it('addTempScheduleSlot appends a slot', () => {
      useUiStore.getState().addTempScheduleSlot(slot1);
      useUiStore.getState().addTempScheduleSlot(slot2);
      expect(useUiStore.getState().tempSchedule).toHaveLength(2);
      expect(useUiStore.getState().tempSchedule[0]).toEqual(slot1);
    });

    it('removeTempScheduleSlot removes by index', () => {
      useUiStore.getState().setTempSchedule([slot1, slot2]);
      useUiStore.getState().removeTempScheduleSlot(0);
      expect(useUiStore.getState().tempSchedule).toHaveLength(1);
      expect(useUiStore.getState().tempSchedule[0]).toEqual(slot2);
    });

    it('removeTempScheduleSlot ignores invalid index', () => {
      useUiStore.getState().setTempSchedule([slot1]);
      useUiStore.getState().removeTempScheduleSlot(-1);
      useUiStore.getState().removeTempScheduleSlot(99);
      expect(useUiStore.getState().tempSchedule).toHaveLength(1);
    });

    it('updateTempScheduleSlot partially updates a slot', () => {
      useUiStore.getState().setTempSchedule([slot1]);
      useUiStore.getState().updateTempScheduleSlot(0, { end: '11:00' });
      expect(useUiStore.getState().tempSchedule[0]?.end).toBe('11:00');
      expect(useUiStore.getState().tempSchedule[0]?.start).toBe('08:00');
    });

    it('updateTempScheduleSlot ignores invalid index', () => {
      useUiStore.getState().setTempSchedule([slot1]);
      useUiStore.getState().updateTempScheduleSlot(5, { end: '12:00' });
      expect(useUiStore.getState().tempSchedule[0]?.end).toBe('10:00');
    });
  });

  // =========================================================================
  // Temp homework links
  // =========================================================================
  describe('temp edit links', () => {
    const link1: HomeworkLink = { label: 'Submission', url: 'https://submit.com' };
    const link2: HomeworkLink = { label: 'Resources', url: 'https://res.com' };

    it('setTempEditLinks replaces all links', () => {
      useUiStore.getState().setTempEditLinks([link1, link2]);
      expect(useUiStore.getState().tempEditLinks).toHaveLength(2);
    });

    it('addTempEditLink appends a link', () => {
      useUiStore.getState().addTempEditLink(link1);
      expect(useUiStore.getState().tempEditLinks).toHaveLength(1);
      expect(useUiStore.getState().tempEditLinks[0]?.label).toBe('Submission');
    });

    it('removeTempEditLink removes by index', () => {
      useUiStore.getState().setTempEditLinks([link1, link2]);
      useUiStore.getState().removeTempEditLink(0);
      expect(useUiStore.getState().tempEditLinks).toHaveLength(1);
      expect(useUiStore.getState().tempEditLinks[0]?.label).toBe('Resources');
    });

    it('removeTempEditLink ignores invalid index', () => {
      useUiStore.getState().setTempEditLinks([link1]);
      useUiStore.getState().removeTempEditLink(-1);
      useUiStore.getState().removeTempEditLink(99);
      expect(useUiStore.getState().tempEditLinks).toHaveLength(1);
    });

    it('updateTempEditLink partially updates a link', () => {
      useUiStore.getState().setTempEditLinks([link1]);
      useUiStore.getState().updateTempEditLink(0, { label: 'Updated' });
      expect(useUiStore.getState().tempEditLinks[0]?.label).toBe('Updated');
      expect(useUiStore.getState().tempEditLinks[0]?.url).toBe('https://submit.com');
    });

    it('updateTempEditLink ignores invalid index', () => {
      useUiStore.getState().setTempEditLinks([link1]);
      useUiStore.getState().updateTempEditLink(5, { label: 'Nope' });
      expect(useUiStore.getState().tempEditLinks[0]?.label).toBe('Submission');
    });
  });

  // =========================================================================
  // showCompletedHomework toggle
  // =========================================================================
  describe('toggleShowCompletedHomework', () => {
    it('starts as true', () => {
      expect(useUiStore.getState().showCompletedHomework).toBe(true);
    });

    it('toggles to false', () => {
      useUiStore.getState().toggleShowCompletedHomework();
      expect(useUiStore.getState().showCompletedHomework).toBe(false);
    });

    it('toggles back to true', () => {
      useUiStore.getState().toggleShowCompletedHomework();
      useUiStore.getState().toggleShowCompletedHomework();
      expect(useUiStore.getState().showCompletedHomework).toBe(true);
    });
  });

  // =========================================================================
  // Sidebar
  // =========================================================================
  describe('sidebar', () => {
    it('starts closed', () => {
      expect(useUiStore.getState().sidebarOpen).toBe(false);
    });

    it('setSidebarOpen opens the sidebar', () => {
      useUiStore.getState().setSidebarOpen(true);
      expect(useUiStore.getState().sidebarOpen).toBe(true);
    });

    it('setSidebarOpen closes the sidebar', () => {
      useUiStore.getState().setSidebarOpen(true);
      useUiStore.getState().setSidebarOpen(false);
      expect(useUiStore.getState().sidebarOpen).toBe(false);
    });

    it('toggleSidebar flips the state', () => {
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(true);
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarOpen).toBe(false);
    });
  });

  // =========================================================================
  // Reset
  // =========================================================================
  describe('resetUi', () => {
    it('restores all state to initial values', () => {
      // Dirty up the state
      useUiStore.getState().openCourseModal('c1');
      useUiStore.getState().pushModal('m1');
      useUiStore.getState().setRecordingsTab(3);
      useUiStore.getState().setSidebarOpen(true);
      useUiStore.getState().toggleShowCompletedHomework();

      useUiStore.getState().resetUi();

      const state = useUiStore.getState();
      expect(state.editingCourseId).toBeNull();
      expect(state.currentRecordingsTab).toBe(0);
      expect(state.modalStack).toEqual([]);
      expect(state.tempSchedule).toEqual([]);
      expect(state.tempRecordingEdit).toBeNull();
      expect(state.tempEditLinks).toEqual([]);
      expect(state.showCompletedHomework).toBe(true);
      expect(state.sidebarOpen).toBe(false);
    });
  });
});
