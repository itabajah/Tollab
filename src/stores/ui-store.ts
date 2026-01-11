import { create } from 'zustand';
import { Course } from '@/types';

type ModalType = 'settings' | 'course' | 'semester' | 'confirm' | 'prompt' | 'import' | null;

interface ConfirmModalData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface PromptModalData {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

interface CourseModalData {
  course: Course;
  initialTab?: 'recordings' | 'homework' | 'details';
}

interface UIState {
  // Modal state
  activeModal: ModalType;
  modalData: ConfirmModalData | PromptModalData | CourseModalData | null;

  // Course modal specific state
  activeCourseId: string | null;
  activeRecordingTabId: string | null;

  // Editing state
  editingScheduleItem: string | null;
  editingHomeworkId: string | null;
  editingRecordingId: string | null;

  // View state
  sidebarCollapsed: boolean;
  calendarSingleDayView: boolean;
  calendarActiveDay: number;

  // Inline preview state
  previewingVideoId: string | null;

  // Modal actions
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;
  openConfirmModal: (data: ConfirmModalData) => void;
  openPromptModal: (data: PromptModalData) => void;
  openCourseModal: (course: Course, initialTab?: 'recordings' | 'homework' | 'details') => void;

  // Course modal actions
  setActiveCourseId: (id: string | null) => void;
  setActiveRecordingTabId: (id: string | null) => void;

  // Editing actions
  setEditingScheduleItem: (id: string | null) => void;
  setEditingHomeworkId: (id: string | null) => void;
  setEditingRecordingId: (id: string | null) => void;
  clearAllEditing: () => void;

  // View actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCalendarSingleDayView: () => void;
  setCalendarActiveDay: (day: number) => void;

  // Preview actions
  setPreviewingVideoId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  // Initial state
  activeModal: null,
  modalData: null,
  activeCourseId: null,
  activeRecordingTabId: null,
  editingScheduleItem: null,
  editingHomeworkId: null,
  editingRecordingId: null,
  sidebarCollapsed: false,
  calendarSingleDayView: false,
  calendarActiveDay: new Date().getDay(),
  previewingVideoId: null,

  // Modal actions
  openModal: (type, data) => {
    set({
      activeModal: type,
      modalData: data as ConfirmModalData | PromptModalData | CourseModalData | null,
    });
  },

  closeModal: () => {
    set({
      activeModal: null,
      modalData: null,
    });
  },

  openConfirmModal: (data) => {
    set({
      activeModal: 'confirm',
      modalData: data,
    });
  },

  openPromptModal: (data) => {
    set({
      activeModal: 'prompt',
      modalData: data,
    });
  },

  openCourseModal: (course, initialTab = 'recordings') => {
    set({
      activeModal: 'course',
      modalData: { course, initialTab },
      activeCourseId: course.id,
      activeRecordingTabId: course.recordings.tabs[0]?.id || null,
    });
  },

  // Course modal actions
  setActiveCourseId: (id) => set({ activeCourseId: id }),
  setActiveRecordingTabId: (id) => set({ activeRecordingTabId: id }),

  // Editing actions
  setEditingScheduleItem: (id) => set({ editingScheduleItem: id }),
  setEditingHomeworkId: (id) => set({ editingHomeworkId: id }),
  setEditingRecordingId: (id) => set({ editingRecordingId: id }),

  clearAllEditing: () =>
    set({
      editingScheduleItem: null,
      editingHomeworkId: null,
      editingRecordingId: null,
    }),

  // View actions
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleCalendarSingleDayView: () =>
    set((state) => ({ calendarSingleDayView: !state.calendarSingleDayView })),

  setCalendarActiveDay: (day) => set({ calendarActiveDay: day }),

  // Preview actions
  setPreviewingVideoId: (id) => set({ previewingVideoId: id }),
}));
