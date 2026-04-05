import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCloseCourseModal = vi.fn();
const mockSetTempSchedule = vi.fn();
const mockAddTempScheduleSlot = vi.fn();
const mockRemoveTempScheduleSlot = vi.fn();
const mockAddCourse = vi.fn();
const mockUpdateCourse = vi.fn();
const mockDeleteCourse = vi.fn();
let mockEditingCourseId: string | null = 'existing-course-1';

vi.mock('@/store/ui-store', () => ({
  useUiStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        editingCourseId: mockEditingCourseId,
        closeCourseModal: mockCloseCourseModal,
        tempSchedule: [],
        setTempSchedule: mockSetTempSchedule,
        addTempScheduleSlot: mockAddTempScheduleSlot,
        removeTempScheduleSlot: mockRemoveTempScheduleSlot,
        currentRecordingsTab: 0,
        showCompletedHomework: false,
        toggleShowCompletedHomework: vi.fn(),
      }),
    { getState: () => ({ currentRecordingsTab: 0 }) },
  ),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      addCourse: mockAddCourse,
      updateCourse: mockUpdateCourse,
      deleteCourse: mockDeleteCourse,
      settings: { showWatchedRecordings: true },
      recordingSortOrders: {},
      homeworkSortOrders: {},
      setRecordingSortOrder: vi.fn(),
      setHomeworkSortOrder: vi.fn(),
      addRecording: vi.fn(),
      addHomework: vi.fn(),
      updateSettings: vi.fn(),
    }),
}));

vi.mock('@/store/selectors', () => ({
  useCourseById: (id: string) =>
    id === 'existing-course-1'
      ? {
          id: 'existing-course-1', name: 'CS 101', number: '234111', points: '3.0',
          lecturer: 'Prof. Smith', faculty: 'CS', location: 'Taub 3', grade: '90',
          syllabus: 'Intro course', notes: 'Good course', color: 'hsl(200, 45%, 50%)',
          exams: { moedA: '2025-06-15', moedB: '2025-07-15' },
          schedule: [], homework: [],
          recordings: { tabs: [{ id: 't1', name: 'Lectures', items: [] }] },
        }
      : undefined,
  useCurrentSemester: () => ({
    id: 's1', name: 'Spring 2025',
    courses: [{ id: 'existing-course-1', color: 'hsl(200, 45%, 50%)' }],
  }),
  useSortedRecordings: () => [],
  useSortedHomework: () => [],
}));

vi.mock('@/utils/dom', () => ({
  getInputValue: (e: Event) => (e.currentTarget as HTMLInputElement).value,
  getSelectValue: (e: Event) => (e.currentTarget as HTMLSelectElement).value,
  getTextAreaValue: (e: Event) => (e.currentTarget as HTMLTextAreaElement).value,
}));

vi.mock('@/constants', () => ({
  DAY_NAMES_FULL: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  DAY_NAMES_SHORT: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  RECORDING_SORT_ORDERS: { DEFAULT: 'default' },
  HOMEWORK_SORT_ORDERS: { MANUAL: 'manual' },
}));

vi.mock('@/components/recordings', () => ({
  RecordingsPanel: () => <div data-testid="recordings-panel">Recordings</div>,
}));
vi.mock('@/components/homework', () => ({
  HomeworkItem: () => <div data-testid="homework-item">HW</div>,
}));
vi.mock('@/components/icons', () => ({
  RecordingsTabIcon: () => <span>REC</span>,
  HomeworkTabIcon: () => <span>HW</span>,
  DetailsTabIcon: () => <span>DET</span>,
}));
vi.mock('@/components/modals/Modal', () => ({
  Modal: ({ isOpen, children, title }: { isOpen: boolean; children: preact.ComponentChildren; title: string }) =>
    isOpen ? <div data-testid="modal" role="dialog"><h2>{title}</h2>{children}</div> : null,
}));

import { CourseModal } from '@/components/modals/CourseModal';

describe('CourseModal', () => {
  beforeEach(() => { vi.clearAllMocks(); mockEditingCourseId = 'existing-course-1'; });

  it('renders when editingCourseId is set', () => {
    render(<CourseModal />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('shows course name as modal title in edit mode', () => {
    render(<CourseModal />);
    expect(screen.getByText('CS 101')).toBeInTheDocument();
  });

  it('renders all 3 tabs in edit mode', () => {
    render(<CourseModal />);
    expect(screen.getByRole('tab', { name: /Recordings/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Homework/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Details/ })).toBeInTheDocument();
  });

  it('has tablist with aria-label', () => {
    render(<CourseModal />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Course tabs');
  });

  it('defaults to Recordings tab in edit mode', () => {
    render(<CourseModal />);
    expect(screen.getByRole('tab', { name: /Recordings/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Details tab on click', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    expect(screen.getByRole('tab', { name: /Details/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Homework tab on click', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Homework/ }));
    expect(screen.getByRole('tab', { name: /Homework/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders details form fields when Details tab is active', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    expect(screen.getByLabelText('Course Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Course Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Lecturer')).toBeInTheDocument();
  });

  it('populates form fields in edit mode', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    expect(screen.getByLabelText('Course Name')).toHaveValue('CS 101');
    expect(screen.getByLabelText('Course Number')).toHaveValue('234111');
    expect(screen.getByLabelText('Lecturer')).toHaveValue('Prof. Smith');
  });

  it('calls updateCourse on save in edit mode', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Course' }));
    expect(mockUpdateCourse).toHaveBeenCalledWith('s1', 'existing-course-1', expect.objectContaining({ name: 'CS 101' }));
    expect(mockCloseCourseModal).toHaveBeenCalled();
  });

  it('shows validation error when name is empty', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    fireEvent.input(screen.getByLabelText('Course Name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Course' }));
    expect(screen.getByText('Course name is required')).toBeInTheDocument();
    expect(mockUpdateCourse).not.toHaveBeenCalled();
  });

  it('shows Delete Course button in edit mode', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    expect(screen.getByRole('button', { name: 'Delete Course' })).toBeInTheDocument();
  });

  it('requires double-click to confirm delete', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Course' }));
    expect(screen.getByRole('button', { name: 'Confirm Delete' })).toBeInTheDocument();
    expect(mockDeleteCourse).not.toHaveBeenCalled();
  });

  it('deletes course on second click', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Course' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));
    expect(mockDeleteCourse).toHaveBeenCalledWith('s1', 'existing-course-1');
  });

  it('renders schedule builder', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    expect(screen.getByText('Weekly Schedule')).toBeInTheDocument();
    expect(screen.getByLabelText('Day of week')).toBeInTheDocument();
    expect(screen.getByLabelText('Start time')).toBeInTheDocument();
    expect(screen.getByLabelText('End time')).toBeInTheDocument();
  });

  it('calls addTempScheduleSlot when adding a schedule slot', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    fireEvent.input(screen.getByLabelText('Start time'), { target: { value: '09:00' } });
    fireEvent.input(screen.getByLabelText('End time'), { target: { value: '10:30' } });
    const addBtns = screen.getAllByRole('button', { name: 'Add' });
    fireEvent.click(addBtns[addBtns.length - 1]!);
    expect(mockAddTempScheduleSlot).toHaveBeenCalledWith(expect.objectContaining({ day: 0, start: '09:00', end: '10:30' }));
  });

  it('does not add schedule slot without start/end times', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    const addBtns = screen.getAllByRole('button', { name: 'Add' });
    fireEvent.click(addBtns[addBtns.length - 1]!);
    expect(mockAddTempScheduleSlot).not.toHaveBeenCalled();
  });

  it('renders color picker', () => {
    render(<CourseModal />);
    fireEvent.click(screen.getByRole('tab', { name: /Details/ }));
    expect(screen.getByLabelText('Course Color')).toBeInTheDocument();
  });

  it('returns null when editingCourseId is null', () => {
    mockEditingCourseId = null;
    const { container } = render(<CourseModal />);
    expect(container.querySelector('[data-testid="modal"]')).not.toBeInTheDocument();
  });

  it('ArrowRight moves to next tab', () => {
    render(<CourseModal />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /Recordings/ }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Homework/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('Home moves to first tab', () => {
    render(<CourseModal />);
    const detailsTab = screen.getByRole('tab', { name: /Details/ });
    fireEvent.click(detailsTab);
    fireEvent.keyDown(detailsTab, { key: 'Home' });
    expect(screen.getByRole('tab', { name: /Recordings/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('End moves to last tab', () => {
    render(<CourseModal />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /Recordings/ }), { key: 'End' });
    expect(screen.getByRole('tab', { name: /Details/ })).toHaveAttribute('aria-selected', 'true');
  });
});