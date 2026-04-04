/**
 * Transient UI state Zustand store.
 *
 * Holds ephemeral state that is never persisted to localStorage:
 * modal stacks, editing context, temp form data, sidebar toggle.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { HomeworkLink, ScheduleSlot } from '@/types';

// ---------------------------------------------------------------------------
// State & action types
// ---------------------------------------------------------------------------

interface UiState {
  /** Course being edited in the course modal (null = creating new). */
  editingCourseId: string | null;
  /** Active recording tab index within the course modal. */
  currentRecordingsTab: number;
  /** Stack of open modal IDs (supports nested modals). */
  modalStack: string[];
  /** Schedule slots being edited in the course modal (not yet saved). */
  tempSchedule: ScheduleSlot[];
  /** Recording item currently being inline-edited. */
  tempRecordingEdit: { tabIndex: number; recordingIndex: number } | null;
  /** Homework links being edited before save. */
  tempEditLinks: HomeworkLink[];
  /** Whether to display completed homework items. */
  showCompletedHomework: boolean;
  /** Whether the sidebar is open (mobile / collapsible layout). */
  sidebarOpen: boolean;
}

interface UiActions {
  // -- Course modal ---------------------------------------------------------
  openCourseModal: (courseId?: string) => void;
  closeCourseModal: () => void;

  // -- Modal stack ----------------------------------------------------------
  pushModal: (id: string) => void;
  popModal: () => void;
  clearModals: () => void;

  // -- Recordings -----------------------------------------------------------
  setRecordingsTab: (index: number) => void;
  setTempRecordingEdit: (
    edit: { tabIndex: number; recordingIndex: number } | null,
  ) => void;

  // -- Schedule temp --------------------------------------------------------
  setTempSchedule: (slots: ScheduleSlot[]) => void;
  addTempScheduleSlot: (slot: ScheduleSlot) => void;
  removeTempScheduleSlot: (index: number) => void;
  updateTempScheduleSlot: (
    index: number,
    updates: Partial<ScheduleSlot>,
  ) => void;

  // -- Homework links temp --------------------------------------------------
  setTempEditLinks: (links: HomeworkLink[]) => void;
  addTempEditLink: (link: HomeworkLink) => void;
  removeTempEditLink: (index: number) => void;
  updateTempEditLink: (index: number, updates: Partial<HomeworkLink>) => void;

  // -- Toggles --------------------------------------------------------------
  toggleShowCompletedHomework: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // -- Reset ----------------------------------------------------------------
  resetUi: () => void;
}

export type UiStore = UiState & UiActions;

// ---------------------------------------------------------------------------
// Initial state (reused by resetUi)
// ---------------------------------------------------------------------------

const INITIAL_STATE: UiState = {
  editingCourseId: null,
  currentRecordingsTab: 0,
  modalStack: [],
  tempSchedule: [],
  tempRecordingEdit: null,
  tempEditLinks: [],
  showCompletedHomework: true,
  sidebarOpen: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUiStore = create<UiStore>()(
  immer((set) => ({
    ...INITIAL_STATE,

    // ======================================================================
    // Course modal
    // ======================================================================

    openCourseModal: (courseId) => {
      set((state) => {
        state.editingCourseId = courseId ?? null;
        state.currentRecordingsTab = 0;
        state.tempSchedule = [];
        state.tempRecordingEdit = null;
        state.tempEditLinks = [];
      });
    },

    closeCourseModal: () => {
      set((state) => {
        state.editingCourseId = null;
        state.currentRecordingsTab = 0;
        state.tempSchedule = [];
        state.tempRecordingEdit = null;
        state.tempEditLinks = [];
      });
    },

    // ======================================================================
    // Modal stack
    // ======================================================================

    pushModal: (id) => {
      set((state) => {
        if (!state.modalStack.includes(id)) {
          state.modalStack.push(id);
        }
      });
    },

    popModal: () => {
      set((state) => {
        state.modalStack.pop();
      });
    },

    clearModals: () => {
      set((state) => {
        state.modalStack = [];
      });
    },

    // ======================================================================
    // Recordings
    // ======================================================================

    setRecordingsTab: (index) => {
      set((state) => {
        state.currentRecordingsTab = index;
      });
    },

    setTempRecordingEdit: (edit) => {
      set((state) => {
        state.tempRecordingEdit = edit;
      });
    },

    // ======================================================================
    // Schedule temp
    // ======================================================================

    setTempSchedule: (slots) => {
      set((state) => {
        state.tempSchedule = slots;
      });
    },

    addTempScheduleSlot: (slot) => {
      set((state) => {
        state.tempSchedule.push({ ...slot });
      });
    },

    removeTempScheduleSlot: (index) => {
      set((state) => {
        if (index >= 0 && index < state.tempSchedule.length) {
          state.tempSchedule.splice(index, 1);
        }
      });
    },

    updateTempScheduleSlot: (index, updates) => {
      set((state) => {
        const slot = state.tempSchedule[index];
        if (slot) Object.assign(slot, updates);
      });
    },

    // ======================================================================
    // Homework links temp
    // ======================================================================

    setTempEditLinks: (links) => {
      set((state) => {
        state.tempEditLinks = links;
      });
    },

    addTempEditLink: (link) => {
      set((state) => {
        state.tempEditLinks.push({ ...link });
      });
    },

    removeTempEditLink: (index) => {
      set((state) => {
        if (index >= 0 && index < state.tempEditLinks.length) {
          state.tempEditLinks.splice(index, 1);
        }
      });
    },

    updateTempEditLink: (index, updates) => {
      set((state) => {
        const link = state.tempEditLinks[index];
        if (link) Object.assign(link, updates);
      });
    },

    // ======================================================================
    // Toggles
    // ======================================================================

    toggleShowCompletedHomework: () => {
      set((state) => {
        state.showCompletedHomework = !state.showCompletedHomework;
      });
    },

    setSidebarOpen: (open) => {
      set((state) => {
        state.sidebarOpen = open;
      });
    },

    toggleSidebar: () => {
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      });
    },

    // ======================================================================
    // Reset
    // ======================================================================

    resetUi: () => {
      set(() => ({ ...INITIAL_STATE }));
    },
  })),
);
