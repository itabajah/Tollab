import { useCallback } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { useCurrentSemester } from '@/store/selectors';
import { useUiStore } from '@/store/ui-store';

// ---------------------------------------------------------------------------
// SVG icon for mobile delete button (matches legacy HTML)
// ---------------------------------------------------------------------------

function TrashIcon() {
  return (
    <svg
      class="semester-delete-icon"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SemesterControls component
// ---------------------------------------------------------------------------

export function SemesterControls() {
  const semesters = useAppStore((s) => s.semesters);
  const currentSemesterId = useAppStore((s) => s.currentSemesterId);
  const setCurrentSemester = useAppStore((s) => s.setCurrentSemester);
  const deleteSemester = useAppStore((s) => s.deleteSemester);
  const currentSemester = useCurrentSemester();
  const pushModal = useUiStore((s) => s.pushModal);

  const handleSemesterChange = useCallback(
    (e: Event) => {
      const target = e.currentTarget as HTMLSelectElement;
      setCurrentSemester(target.value);
    },
    [setCurrentSemester],
  );

  const handleAddSemester = useCallback(() => {
    // Wave 6+ will open the AddSemesterModal
    pushModal('add-semester');
  }, [pushModal]);

  const handleDeleteSemester = useCallback(() => {
    if (!currentSemester) return;
    const confirmed = window.confirm(
      `Delete semester "${currentSemester.name}" and all its courses?`,
    );
    if (confirmed) {
      deleteSemester(currentSemester.id);
    }
  }, [currentSemester, deleteSemester]);

  return (
    <div class="semester-controls">
      <select
        id="semester-select"
        value={currentSemesterId ?? ''}
        onChange={handleSemesterChange}
      >
        {semesters.length === 0 && <option value="">No semesters</option>}
        {semesters.map((sem) => (
          <option key={sem.id} value={sem.id}>
            {sem.name}
          </option>
        ))}
      </select>
      <div class="semester-actions">
        <button
          id="add-semester-btn"
          class="btn-secondary"
          title="Add Semester"
          onClick={handleAddSemester}
        >
          +
        </button>
        <button
          id="delete-semester-btn"
          class="btn-secondary"
          title="Delete Current Semester"
          onClick={handleDeleteSemester}
        >
          <TrashIcon />
          <span class="semester-delete-text">Delete</span>
        </button>
      </div>
    </div>
  );
}
