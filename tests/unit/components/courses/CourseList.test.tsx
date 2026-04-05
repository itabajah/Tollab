/**
 * Tests for CourseList component.
 *
 * Covers: empty state (no semester), empty state (no courses),
 * renders course cards, Add Course button.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Course, Semester } from '@/types';

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

let mockSemester: Semester | null = null;
let mockCourses: Course[] = [];
const mockOpenCourseModal = vi.fn();
const mockPushModal = vi.fn();

vi.mock('@/store/selectors', () => ({
  useCurrentSemester: () => mockSemester,
  useAllCourses: () => mockCourses,
  useCourseProgress: () => ({ watchedCount: 0, totalRecordings: 0, completedHomework: 0, totalHomework: 0 }),
}));

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      openCourseModal: mockOpenCourseModal,
      pushModal: mockPushModal,
    }),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ reorderCourse: vi.fn() }),
}));

// Lazy import after mocks
const { CourseList } = await import('@/components/courses/CourseList');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSemester(): Semester {
  return {
    id: 'sem-1',
    name: 'Winter 2025',
    courses: [],
    calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0,1,2,3,4,5] },
  };
}

function makeCourse(id: string, name: string): Course {
  return {
    id,
    name,
    number: '',
    points: '',
    lecturer: '',
    faculty: '',
    location: '',
    grade: '',
    color: '',
    syllabus: '',
    notes: '',
    exams: { moedA: '', moedB: '' },
    schedule: [],
    homework: [],
    recordings: { tabs: [] },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CourseList', () => {
  beforeEach(() => {
    mockSemester = null;
    mockCourses = [];
    vi.clearAllMocks();
  });

  // -- No semester ----------------------------------------------------------

  it('shows no-semester message when no semester is selected', () => {
    mockSemester = null;
    render(<CourseList />);
    expect(screen.getByText(/No semester selected/)).toBeInTheDocument();
  });

  // -- No courses -----------------------------------------------------------

  it('shows no-courses empty state when semester exists but has no courses', () => {
    mockSemester = makeSemester();
    mockCourses = [];
    render(<CourseList />);
    expect(screen.getByText(/No courses yet/)).toBeInTheDocument();
  });

  // -- With courses ---------------------------------------------------------

  it('renders course cards when courses exist', () => {
    mockSemester = makeSemester();
    mockCourses = [
      makeCourse('c-1', 'Intro to CS'),
      makeCourse('c-2', 'Data Structures'),
    ];
    render(<CourseList />);
    expect(screen.getByText('Intro to CS')).toBeInTheDocument();
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
  });

  // -- Add Course button ----------------------------------------------------

  it('renders Add Course button when semester selected', () => {
    mockSemester = makeSemester();
    render(<CourseList />);
    expect(screen.getByText(/Add Course/)).toBeInTheDocument();
  });

  it('opens course modal when Add Course is clicked', () => {
    mockSemester = makeSemester();
    render(<CourseList />);
    fireEvent.click(screen.getByText(/Add Course/));
    expect(mockOpenCourseModal).toHaveBeenCalled();
    expect(mockPushModal).toHaveBeenCalledWith('course-modal');
  });

  it('does not render Add Course button when no semester', () => {
    mockSemester = null;
    render(<CourseList />);
    expect(screen.queryByText(/Add Course/)).not.toBeInTheDocument();
  });
});
