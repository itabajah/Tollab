/**
 * HomeworkItem — A single homework entry in the sidebar or modal list.
 *
 * Shows: completion checkbox, title, due date with urgency color,
 * course name badge. Click to expand → HomeworkEditor.
 * Click course name → opens course modal on homework tab.
 */

import { useCallback, useState } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { useUiStore } from '@/store/ui-store';
import type { Homework } from '@/types';

import { HomeworkEditor } from './HomeworkEditor';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HomeworkItemProps {
  courseId: string;
  courseName: string;
  courseColor: string;
  homework: Homework;
  homeworkIndex: number;
  /** Variant: "sidebar" for compact sidebar display, "modal" for in-modal list. */
  variant?: 'sidebar' | 'modal';
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

function parseDate(ymd: string): Date | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

interface DaysLeftInfo {
  text: string;
  cssClass: string;
}

function getDaysLeft(dueDate: string, completed: boolean): DaysLeftInfo | null {
  if (completed) return null;
  const due = parseDate(dueDate);
  if (!due) return null;

  const today = startOfDay(new Date());
  const dueMidnight = startOfDay(due);
  const diffMs = dueMidnight.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays < 0) {
    return { text: `[${Math.abs(diffDays)}d overdue]`, cssClass: 'overdue' };
  }
  if (diffDays === 0) {
    return { text: '[Today]', cssClass: 'today' };
  }
  if (diffDays === 1) {
    return { text: '[Tomorrow]', cssClass: 'tomorrow' };
  }
  return { text: `[${diffDays}d left]`, cssClass: '' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HomeworkItem({
  courseId,
  courseName,
  courseColor,
  homework,
  homeworkIndex,
  variant = 'sidebar',
}: HomeworkItemProps) {
  const toggleHomeworkCompleted = useAppStore((s) => s.toggleHomeworkCompleted);
  const deleteHomework = useAppStore((s) => s.deleteHomework);
  const openCourseModal = useUiStore((s) => s.openCourseModal);

  const [expanded, setExpanded] = useState(false);

  const dateStr = homework.dueDate
    ? DATE_FORMATTER.format(parseDate(homework.dueDate) ?? new Date())
    : 'No Date';

  const daysLeft = homework.dueDate
    ? getDaysLeft(homework.dueDate, homework.completed)
    : null;

  const hasNotes = !!(homework.notes && homework.notes.trim());

  // -- Handlers -------------------------------------------------------------

  const handleToggle = useCallback(
    (e: Event) => {
      e.stopPropagation();
      toggleHomeworkCompleted(courseId, homeworkIndex);
    },
    [courseId, homeworkIndex, toggleHomeworkCompleted],
  );

  const handleCourseClick = useCallback(
    (e: Event) => {
      e.stopPropagation();
      openCourseModal(courseId);
    },
    [courseId, openCourseModal],
  );

  const handleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleDelete = useCallback(
    (e: Event) => {
      e.stopPropagation();
      if (window.confirm('Delete this homework?')) {
        deleteHomework(courseId, homeworkIndex);
      }
    },
    [courseId, homeworkIndex, deleteHomework],
  );

  // -- Build links display for sidebar variant ------------------------------

  const links = homework.links || [];
  let linksHtml = null;
  if (variant === 'sidebar' && links.length > 0) {
    const displayLinks = links.length <= 3 ? links : links.slice(0, 2);
    const remaining = links.length > 3 ? links.length - 2 : 0;
    linksHtml = (
      <div class="sidebar-hw-links">
        {displayLinks.map((link, i) => (
          <a
            key={`${link.url}-${i}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="sidebar-hw-link"
            onClick={(e: Event) => e.stopPropagation()}
          >
            {link.label}
          </a>
        ))}
        {remaining > 0 && (
          <span class="sidebar-hw-more">+{remaining} more</span>
        )}
      </div>
    );
  }

  // -- Render: Sidebar variant (event-card) ---------------------------------

  if (variant === 'sidebar') {
    return (
      <div
        class={`event-card homework`}
        style={{
          cursor: 'pointer',
          opacity: homework.completed ? '0.6' : undefined,
          borderLeftColor: courseColor || undefined,
        }}
        onClick={handleExpand}
      >
        <div class="sidebar-hw-row">
          <input
            type="checkbox"
            class="sidebar-hw-checkbox"
            checked={homework.completed}
            onClick={(e: Event) => e.stopPropagation()}
            onChange={handleToggle}
          />
          <div
            class="sidebar-hw-content"
            style={{
              textDecoration: homework.completed ? 'line-through' : undefined,
            }}
          >
            <div class="event-date">
              {dateStr}{' '}
              {daysLeft && (
                <span class={`hw-days-left ${daysLeft.cssClass}`}>
                  {daysLeft.text}
                </span>
              )}
            </div>
            <div class="event-title">
              {homework.title}
              {hasNotes && <span class="hw-indicators">has notes</span>}
            </div>
            <div class="event-course" onClick={handleCourseClick}>
              {courseName}
            </div>
          </div>
          {linksHtml}
        </div>
        {expanded && (
          <HomeworkEditor
            courseId={courseId}
            homeworkIndex={homeworkIndex}
            title={homework.title}
            dueDate={homework.dueDate}
            notes={homework.notes}
            links={homework.links}
            onClose={handleCloseEditor}
          />
        )}
      </div>
    );
  }

  // -- Render: Modal variant (homework-item) --------------------------------

  return (
    <div class={`homework-item${homework.completed ? ' completed' : ''}`}>
      <div class="hw-main-row">
        <input
          type="checkbox"
          class="hw-checkbox"
          checked={homework.completed}
          onChange={handleToggle}
        />
        <div class="hw-title-row" onClick={handleExpand} style={{ cursor: 'pointer' }}>
          <span class="hw-title">{homework.title}</span>
          {homework.dueDate ? (
            <span class="hw-due-date">
              Due: {dateStr}{' '}
              {daysLeft && (
                <span class={`hw-days-left ${daysLeft.cssClass}`}>
                  {daysLeft.text}
                </span>
              )}
            </span>
          ) : (
            <span class="hw-due-date hw-no-date">No date</span>
          )}
        </div>
        <div class="hw-actions">
          <button
            type="button"
            class="hw-action-btn"
            onClick={handleExpand}
          >
            {expanded ? 'Close' : 'Edit'}
          </button>
          <button
            type="button"
            class="hw-action-btn hw-action-btn-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Links display */}
      {!expanded && links.length > 0 && (
        <div class="hw-links-display">
          {links.map((link, i) => (
            <a
              key={`${link.url}-${i}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="hw-link-chip"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      {expanded && (
        <HomeworkEditor
          courseId={courseId}
          homeworkIndex={homeworkIndex}
          title={homework.title}
          dueDate={homework.dueDate}
          notes={homework.notes}
          links={homework.links}
          onClose={handleCloseEditor}
        />
      )}

      {/* Notes textarea (visible when not in edit mode) */}
      {!expanded && (
        <textarea
          class="hw-notes"
          placeholder="Add notes..."
          value={homework.notes}
          onInput={(e) => {
            // Direct inline notes update (matches legacy behavior)
            const val = (e.target as HTMLTextAreaElement).value;
            useAppStore
              .getState()
              .updateHomework(courseId, homeworkIndex, { notes: val });
          }}
        />
      )}
    </div>
  );
}
