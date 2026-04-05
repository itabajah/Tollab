import { useCallback } from 'preact/hooks';

import { useAllCourses, useCurrentSemester } from '@/store/selectors';
import { useUiStore } from '@/store/ui-store';

import { CourseCard } from './CourseCard';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the course card list for the current semester.
 *
 * Mirrors legacy `renderCourses()` in render.js:
 * - Empty state when no courses
 * - Course cards with reorder buttons
 * - "Add Course" FAB at the bottom
 */
export function CourseList() {
  const semester = useCurrentSemester();
  const courses = useAllCourses();
  const openCourseModal = useUiStore((s) => s.openCourseModal);

  const handleAddCourse = useCallback(() => {
    openCourseModal();
  }, [openCourseModal]);

  // No semester selected
  if (!semester) {
    return (
      <>
        <div id="course-list" class="course-list">
          <div class="course-list-empty">
            No semester selected. Use the controls above to create or import one.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div id="course-list" class="course-list">
        {courses.length === 0 ? (
          <div class="course-list-empty">
            No courses yet. Click + to add one.
          </div>
        ) : (
          courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              totalCourses={courses.length}
            />
          ))
        )}
      </div>

      <button
        id="add-course-fab"
        class="add-course-row-btn"
        title="Add Course"
        onClick={handleAddCourse}
      >
        <span class="add-course-icon">+</span> Add Course
      </button>
    </>
  );
}
