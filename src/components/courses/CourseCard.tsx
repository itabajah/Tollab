import { useCallback } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { useCurrentSemester } from '@/store/selectors';
import { useUiStore } from '@/store/ui-store';
import type { Course } from '@/types';

import { CourseProgress } from './CourseProgress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the metadata string (number • points • grade) matching legacy. */
function buildMetaParts(course: Course): string {
  const parts: string[] = [];
  if (course.number) parts.push(`#${course.number}`);
  if (course.points) parts.push(`${course.points} pts`);
  if (course.grade) parts.push(`Grade: ${course.grade}%`);
  return parts.join(' \u2022 ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CourseCardProps {
  course: Course;
  index: number;
  totalCourses: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Single course card matching the legacy `createCourseCard()` in render.js.
 *
 * Structure:
 *   .course-card  (colored left border)
 *     .course-reorder-buttons
 *     .course-left-col
 *       .course-title
 *       .course-info  (faculty, lecturer, location, notes)
 *       .course-meta-info-mobile
 *     .course-progress-section
 *       .course-meta-right
 *       CourseProgress rows
 */
export function CourseCard({ course, index, totalCourses }: CourseCardProps) {
  const semester = useCurrentSemester();
  const reorderCourse = useAppStore((s) => s.reorderCourse);
  const openCourseModal = useUiStore((s) => s.openCourseModal);
  const pushModal = useUiStore((s) => s.pushModal);

  const metaParts = buildMetaParts(course);

  const handleClick = useCallback(() => {
    openCourseModal(course.id);
    pushModal('course-modal');
  }, [course.id, openCourseModal, pushModal]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const handleMoveUp = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (semester) reorderCourse(semester.id, index, 'up');
    },
    [semester, reorderCourse, index],
  );

  const handleMoveDown = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (semester) reorderCourse(semester.id, index, 'down');
    },
    [semester, reorderCourse, index],
  );

  // Colored left border via inline style — only the border color varies per card
  const borderStyle = course.color
    ? { borderLeftColor: course.color, borderLeftWidth: '4px' }
    : undefined;

  return (
    <div
      class="course-card"
      style={borderStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* Reorder buttons */}
      <div class="course-reorder-buttons">
        <button
          class="reorder-btn"
          onClick={handleMoveUp}
          disabled={index === 0}
          title="Move up"
        >
          ▲
        </button>
        <button
          class="reorder-btn"
          onClick={handleMoveDown}
          disabled={index === totalCourses - 1}
          title="Move down"
        >
          ▼
        </button>
      </div>

      {/* Left column — title, info, meta (mobile) */}
      <div class="course-left-col">
        <div class="course-title">{course.name}</div>
        <div class="course-info">
          {course.faculty && (
            <div class="course-detail-row">Faculty: {course.faculty}</div>
          )}
          {course.lecturer && (
            <div class="course-detail-row">Lecturer: {course.lecturer}</div>
          )}
          {course.location && (
            <div class="course-detail-row">Location: {course.location}</div>
          )}
          {course.notes && <div class="course-notes">{course.notes}</div>}
        </div>
        {metaParts && <div class="course-meta-info-mobile">{metaParts}</div>}
      </div>

      {/* Right column — meta + progress */}
      <div class="course-progress-section">
        {metaParts && <div class="course-meta-right">{metaParts}</div>}
        <CourseProgress courseId={course.id} />
      </div>
    </div>
  );
}
