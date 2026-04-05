/**
 * Tests for CourseProgress component.
 */

import { render, screen } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseCourseProgress = vi.fn();

vi.mock('@/store/selectors', () => ({
  useCourseProgress: (courseId: string) => mockUseCourseProgress(courseId),
}));

import { CourseProgress } from '@/components/courses/CourseProgress';

describe('CourseProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when all counters are zero', () => {
    mockUseCourseProgress.mockReturnValue({
      watchedCount: 0,
      totalRecordings: 0,
      completedHomework: 0,
      totalHomework: 0,
    });
    const { container } = render(<CourseProgress courseId="c1" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders recording progress when recordings exist', () => {
    mockUseCourseProgress.mockReturnValue({
      watchedCount: 3,
      totalRecordings: 10,
      completedHomework: 0,
      totalHomework: 0,
    });
    render(<CourseProgress courseId="c1" />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.getByTitle('Lectures watched')).toBeInTheDocument();
  });

  it('renders homework progress when homework exists', () => {
    mockUseCourseProgress.mockReturnValue({
      watchedCount: 0,
      totalRecordings: 0,
      completedHomework: 5,
      totalHomework: 8,
    });
    render(<CourseProgress courseId="c1" />);
    expect(screen.getByText('5/8')).toBeInTheDocument();
    expect(screen.getByTitle('Homework completed')).toBeInTheDocument();
  });

  it('renders both recording and homework progress', () => {
    mockUseCourseProgress.mockReturnValue({
      watchedCount: 2,
      totalRecordings: 5,
      completedHomework: 1,
      totalHomework: 3,
    });
    render(<CourseProgress courseId="c1" />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('hides recording progress when totalRecordings is zero', () => {
    mockUseCourseProgress.mockReturnValue({
      watchedCount: 0,
      totalRecordings: 0,
      completedHomework: 1,
      totalHomework: 2,
    });
    render(<CourseProgress courseId="c1" />);
    expect(screen.queryByTitle('Lectures watched')).not.toBeInTheDocument();
    expect(screen.getByTitle('Homework completed')).toBeInTheDocument();
  });

  it('hides homework progress when totalHomework is zero', () => {
    mockUseCourseProgress.mockReturnValue({
      watchedCount: 1,
      totalRecordings: 2,
      completedHomework: 0,
      totalHomework: 0,
    });
    render(<CourseProgress courseId="c1" />);
    expect(screen.getByTitle('Lectures watched')).toBeInTheDocument();
    expect(screen.queryByTitle('Homework completed')).not.toBeInTheDocument();
  });

  it('passes correct courseId to useCourseProgress', () => {
    mockUseCourseProgress.mockReturnValue({
      watchedCount: 0, totalRecordings: 0, completedHomework: 0, totalHomework: 0,
    });
    render(<CourseProgress courseId="my-course-123" />);
    expect(mockUseCourseProgress).toHaveBeenCalledWith('my-course-123');
  });
});
