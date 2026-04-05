/**
 * Tests for CourseCard component.
 *
 * Covers: render with props, title, meta info, colored border, reorder buttons,
 * click opens modal, keyboard Enter/Space, faculty/lecturer/location/notes display.
 */

import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseCard } from '@/components/courses/CourseCard';
import type { Course } from '@/types';

// ---------------------------------------------------------------------------
// Mock stores
// ---------------------------------------------------------------------------

const mockOpenCourseModal = vi.fn();
const mockPushModal = vi.fn();
const mockReorderCourse = vi.fn();

vi.mock('@/store/ui-store', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      openCourseModal: mockOpenCourseModal,
      pushModal: mockPushModal,
    }),
}));

vi.mock('@/store/selectors', () => ({
  useCurrentSemester: () => ({ id: 'sem-1', name: 'Winter 2025', courses: [], calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0,1,2,3,4,5] } }),
  useCourseProgress: () => ({ watchedCount: 0, totalRecordings: 0, completedHomework: 0, totalHomework: 0 }),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ reorderCourse: mockReorderCourse }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c-1',
    name: 'Intro to CS',
    number: '234111',
    points: '3.0',
    lecturer: 'Dr. Smith',
    faculty: 'CS',
    location: 'Taub 2',
    grade: '95',
    color: 'hsl(137, 45%, 50%)',
    syllabus: '',
    notes: 'Good course',
    exams: { moedA: '', moedB: '' },
    schedule: [],
    homework: [],
    recordings: { tabs: [] },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CourseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Render basics --------------------------------------------------------

  it('renders without crash', () => {
    render(<CourseCard course={makeCourse()} index={0} totalCourses={3} />);
    expect(screen.getByText('Intro to CS')).toBeInTheDocument();
  });

  it('displays course name', () => {
    render(<CourseCard course={makeCourse({ name: 'Data Structures' })} index={0} totalCourses={1} />);
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
  });

  it('displays faculty', () => {
    render(<CourseCard course={makeCourse({ faculty: 'Computer Science' })} index={0} totalCourses={1} />);
    expect(screen.getByText(/Computer Science/)).toBeInTheDocument();
  });

  it('displays lecturer', () => {
    render(<CourseCard course={makeCourse({ lecturer: 'Prof. Cohen' })} index={0} totalCourses={1} />);
    expect(screen.getByText(/Prof. Cohen/)).toBeInTheDocument();
  });

  it('displays location', () => {
    render(<CourseCard course={makeCourse({ location: 'Taub 5' })} index={0} totalCourses={1} />);
    expect(screen.getByText(/Taub 5/)).toBeInTheDocument();
  });

  it('displays notes', () => {
    render(<CourseCard course={makeCourse({ notes: 'Important notes' })} index={0} totalCourses={1} />);
    expect(screen.getByText('Important notes')).toBeInTheDocument();
  });

  // -- Meta info (number, points, grade) ------------------------------------

  it('displays course number', () => {
    render(<CourseCard course={makeCourse({ number: '234111' })} index={0} totalCourses={1} />);
    expect(screen.getAllByText(/#234111/).length).toBeGreaterThan(0);
  });

  it('displays points', () => {
    render(<CourseCard course={makeCourse({ points: '4.5' })} index={0} totalCourses={1} />);
    expect(screen.getAllByText(/4\.5 pts/).length).toBeGreaterThan(0);
  });

  it('displays grade', () => {
    render(<CourseCard course={makeCourse({ grade: '87' })} index={0} totalCourses={1} />);
    expect(screen.getAllByText(/Grade: 87%/).length).toBeGreaterThan(0);
  });

  // -- Colored border -------------------------------------------------------

  it('applies border color from course.color', () => {
    const { container } = render(
      <CourseCard course={makeCourse({ color: 'hsl(200, 45%, 50%)' })} index={0} totalCourses={1} />
    );
    const card = container.querySelector('.course-card') as HTMLElement;
    // jsdom converts HSL to RGB, so just check it's set (non-empty)
    expect(card.style.borderLeftColor).not.toBe('');
  });

  // -- Accessibility --------------------------------------------------------

  it('has role button and tabIndex 0', () => {
    const { container } = render(
      <CourseCard course={makeCourse()} index={0} totalCourses={1} />
    );
    const card = container.querySelector('.course-card')!;
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
  });

  // -- Click opens modal ----------------------------------------------------

  it('opens course modal on click', () => {
    const { container } = render(
      <CourseCard course={makeCourse({ id: 'c-42' })} index={0} totalCourses={1} />
    );
    fireEvent.click(container.querySelector('.course-card')!);
    expect(mockOpenCourseModal).toHaveBeenCalledWith('c-42');
    expect(mockPushModal).toHaveBeenCalledWith('course-modal');
  });

  // -- Keyboard support -----------------------------------------------------

  it('opens course modal on Enter key', () => {
    const { container } = render(
      <CourseCard course={makeCourse({ id: 'c-7' })} index={0} totalCourses={1} />
    );
    fireEvent.keyDown(container.querySelector('.course-card')!, { key: 'Enter' });
    expect(mockOpenCourseModal).toHaveBeenCalledWith('c-7');
  });

  it('opens course modal on Space key', () => {
    const { container } = render(
      <CourseCard course={makeCourse({ id: 'c-8' })} index={0} totalCourses={1} />
    );
    fireEvent.keyDown(container.querySelector('.course-card')!, { key: ' ' });
    expect(mockOpenCourseModal).toHaveBeenCalledWith('c-8');
  });

  // -- Reorder buttons ------------------------------------------------------

  it('renders up and down reorder buttons', () => {
    render(<CourseCard course={makeCourse()} index={1} totalCourses={3} />);
    expect(screen.getByTitle('Move up')).toBeInTheDocument();
    expect(screen.getByTitle('Move down')).toBeInTheDocument();
  });

  it('disables up button for first course', () => {
    render(<CourseCard course={makeCourse()} index={0} totalCourses={3} />);
    expect(screen.getByTitle('Move up')).toBeDisabled();
  });

  it('disables down button for last course', () => {
    render(<CourseCard course={makeCourse()} index={2} totalCourses={3} />);
    expect(screen.getByTitle('Move down')).toBeDisabled();
  });

  it('hides optional fields when empty', () => {
    const { container } = render(
      <CourseCard
        course={makeCourse({ faculty: '', lecturer: '', location: '', notes: '' })}
        index={0}
        totalCourses={1}
      />
    );
    expect(container.querySelectorAll('.course-detail-row')).toHaveLength(0);
    expect(container.querySelector('.course-notes')).not.toBeInTheDocument();
  });
});
