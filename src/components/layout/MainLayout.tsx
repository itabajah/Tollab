import type { ComponentChildren } from 'preact';

import { HomeworkSidebar } from '@/components/homework';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MainLayoutProps {
  /** Content for the left column (course list). */
  courseListSlot?: ComponentChildren;
  /** Content for the right column (calendar + homework sidebar). */
  sidebarSlot?: ComponentChildren;
}

// ---------------------------------------------------------------------------
// MainLayout component
// ---------------------------------------------------------------------------

/**
 * Two-column flex layout matching the legacy `.app-layout` structure.
 *
 * Left: `.container` — course list area
 * Right: `.calendar-container` — weekly schedule + homework sidebar
 *
 * Responsive: collapses to single column at ≤900px via existing layout.css.
 */
export function MainLayout({ courseListSlot, sidebarSlot }: MainLayoutProps) {
  return (
    <div class="app-layout">
      {/* Left column — course list */}
      <div class="container">
        {courseListSlot ?? (
          <>
            <div id="course-list" class="course-list">
              {/* Courses will be rendered by Wave 7+ components */}
            </div>
            <button
              id="add-course-fab"
              class="add-course-row-btn"
              title="Add Course"
            >
              <span class="add-course-icon">+</span> Add Course
            </button>
          </>
        )}
      </div>

      {/* Right column — calendar + homework */}
      <div class="calendar-container">
        {sidebarSlot ?? (
          <>
            <div class="schedule-section-header">
              <h2 class="schedule-section-title">
                Weekly Schedule
              </h2>
            </div>
            <div class="calendar-scroll-wrapper">
              <div id="weekly-schedule" class="weekly-schedule">
                <div class="schedule-placeholder">No classes scheduled.</div>
              </div>
            </div>

            <HomeworkSidebar />
          </>
        )}
      </div>
    </div>
  );
}
