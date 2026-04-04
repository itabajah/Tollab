import { useCourseProgress } from '@/store/selectors';

// ---------------------------------------------------------------------------
// SVG icons matching legacy render.js (buildProgressHtml)
// ---------------------------------------------------------------------------

function LecturesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 14"
      fill="currentColor"
    >
      <circle cx="5" cy="4" r="2.5" />
      <path d="M5 7c-2.5 0-4 1.2-4 3v3h8v-3c0-1.8-1.5-3-4-3z" />
      <rect
        x="12"
        y="2"
        width="10"
        height="9"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <line x1="14" y1="5" x2="20" y2="5" stroke="currentColor" stroke-width="1" />
      <line x1="14" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1" />
      <line
        x1="8"
        y1="8"
        x2="13"
        y2="4"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <circle cx="13" cy="4" r="1" fill="currentColor" />
    </svg>
  );
}

function HomeworkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CourseProgressProps {
  courseId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders watched/completed progress indicators for a course card.
 * Matches legacy `buildProgressHtml()` output in render.js.
 */
export function CourseProgress({ courseId }: CourseProgressProps) {
  const progress = useCourseProgress(courseId);

  // Nothing to show when all counters are zero
  if (progress.totalRecordings === 0 && progress.totalHomework === 0) {
    return null;
  }

  return (
    <>
      {progress.totalRecordings > 0 && (
        <div class="course-progress-row">
          <span class="progress-text" title="Lectures watched">
            {progress.watchedCount}/{progress.totalRecordings} <LecturesIcon />
          </span>
        </div>
      )}

      {progress.totalHomework > 0 && (
        <div class="course-progress-row">
          <span class="progress-text" title="Homework completed">
            {progress.completedHomework}/{progress.totalHomework} <HomeworkIcon />
          </span>
        </div>
      )}
    </>
  );
}
