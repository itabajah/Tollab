/**
 * HomeworkSidebar — Right-column homework section.
 *
 * Groups homework by urgency: overdue (red), today (yellow),
 * this week, upcoming, no date. Includes "Show Done" toggle
 * and an inline "Add Homework" form.
 *
 * Uses useHomeworkByUrgency() selector for grouped data.
 */

import { useCallback, useState } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import {
  useCurrentSemester,
  useHomeworkByUrgency,
} from '@/store/selectors';
import type { HomeworkByUrgency, HomeworkWithCourse } from '@/store/selectors';
import { useUiStore } from '@/store/ui-store';
import type { Homework } from '@/types';

import { HomeworkItem } from './HomeworkItem';

// ---------------------------------------------------------------------------
// Urgency section config
// ---------------------------------------------------------------------------

interface UrgencySection {
  key: keyof HomeworkByUrgency;
  label: string;
}

const URGENCY_SECTIONS: readonly UrgencySection[] = [
  { key: 'overdue', label: '⚠ Overdue' },
  { key: 'today', label: '📅 Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'noDate', label: 'No Date' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeworkSidebar() {
  const semester = useCurrentSemester();
  const grouped = useHomeworkByUrgency();
  const showCompleted = useUiStore((s) => s.showCompletedHomework);
  const toggleShowCompleted = useUiStore((s) => s.toggleShowCompletedHomework);
  const addHomework = useAppStore((s) => s.addHomework);

  // -- Add homework form state ----------------------------------------------
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [addCourseId, setAddCourseId] = useState('');
  const [titleError, setTitleError] = useState('');

  const courses = semester?.courses ?? [];

  const handleAdd = useCallback(() => {
    const title = newTitle.trim();
    if (!title) {
      setTitleError('Please enter an assignment title.');
      return;
    }
    setTitleError('');
    // Pick a course: use selected, or first available
    const targetCourseId = addCourseId || courses[0]?.id;
    if (!targetCourseId) return;

    const hw: Homework = {
      title,
      dueDate: newDate,
      completed: false,
      notes: '',
      links: [],
    };
    addHomework(targetCourseId, hw);
    setNewTitle('');
    setNewDate('');
  }, [newTitle, newDate, addCourseId, courses, addHomework]);

  // -- Filter completed items -----------------------------------------------

  const filterCompleted = useCallback(
    (items: HomeworkWithCourse[]): HomeworkWithCourse[] =>
      showCompleted ? items : items.filter((h) => !h.homework.completed),
    [showCompleted],
  );

  // -- Compute total visible count ------------------------------------------

  const totalItems = URGENCY_SECTIONS.reduce(
    (sum, section) => sum + filterCompleted(grouped[section.key]).length,
    0,
  );

  // -- Render ---------------------------------------------------------------

  if (!semester) {
    return (
      <div class="upcoming-list">
        <div
          style={{
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
          }}
        >
          No active semester.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Section header */}
      <div class="homework-section-header">
        <h3 class="homework-section-title">Homework</h3>
        <label class="show-toggle-label">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={toggleShowCompleted}
          />
          <span>Show Done</span>
        </label>
      </div>

      {/* Homework list */}
      <div class="upcoming-list">
        {totalItems === 0 ? (
          <div
            style={{
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
            }}
          >
            No homework found.
          </div>
        ) : (
          URGENCY_SECTIONS.map((section) => {
            const items = filterCompleted(grouped[section.key]);
            if (items.length === 0) return null;
            return (
              <div key={section.key}>
                <div
                  class="urgency-section-label"
                >
                  {section.label}
                </div>
                {items.map((entry) => (
                  <HomeworkItem
                    key={`${entry.courseId}-${entry.homeworkIndex}`}
                    courseId={entry.courseId}
                    courseName={entry.courseName}
                    courseColor={entry.courseColor}
                    homework={entry.homework}
                    homeworkIndex={entry.homeworkIndex}
                    variant="sidebar"
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Add homework form */}
      {courses.length > 0 && (
        <>
          <div class="hw-add-row hw-add-row-top">
            {courses.length > 1 && (
              <select
                value={addCourseId || courses[0]?.id || ''}
                onChange={(e) =>
                  setAddCourseId((e.target as HTMLSelectElement).value)
                }
                class="hw-course-select"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.length > 15
                      ? c.name.slice(0, 15) + '…'
                      : c.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              className={titleError ? 'input-error' : undefined}
              placeholder="Assignment title..."
              value={newTitle}
              onInput={(e) => {
                setNewTitle((e.target as HTMLInputElement).value);
                setTitleError('');
              }}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
              }}
            />
            <input
              type="date"
              value={newDate}
              onInput={(e) =>
                setNewDate((e.target as HTMLInputElement).value)
              }
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
              }}
            />
            <button type="button" class="btn-secondary" onClick={handleAdd}>
              Add
            </button>
          </div>
          {titleError && (
            <div className="validation-error" role="alert">{titleError}</div>
          )}
        </>
      )}
    </>
  );
}
