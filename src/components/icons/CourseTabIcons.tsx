/**
 * SVG icon components for CourseModal tab buttons.
 * Replaces dangerouslySetInnerHTML usage with safe JSX.
 */

export function RecordingsTabIcon() {
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
      <rect x="12" y="2" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5" />
      <line x1="14" y1="5" x2="20" y2="5" stroke="currentColor" stroke-width="1" />
      <line x1="14" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1" />
      <line x1="8" y1="8" x2="13" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      <circle cx="13" cy="4" r="1" fill="currentColor" />
    </svg>
  );
}

export function HomeworkTabIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
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

export function DetailsTabIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
