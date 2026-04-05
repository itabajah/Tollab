/**
 * EventChip — a positioned course block inside a schedule cell.
 *
 * Renders absolutely within a `.schedule-cell`, using inline styles for
 * dynamic top offset, height, and background color (all computed from
 * the ScheduleSlot start/end times and the course color).
 *
 * Uses the `.schedule-block` CSS class from calendar.css.
 */

import type { Course, ScheduleSlot } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cell min-height in px (from calendar.css `.schedule-cell { min-height: 30px }`). */
const CELL_HEIGHT_PX = 30;

function parseTime(hhmm: string): { h: number; m: number } {
  const parts = hhmm.split(':');
  return {
    h: Number(parts[0]),
    m: Number(parts[1]),
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventChipProps {
  course: Course;
  slot: ScheduleSlot;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventChip({ course, slot, onClick }: EventChipProps) {
  const start = parseTime(slot.start);
  const end = parseTime(slot.end);

  const durationHours = end.h + end.m / 60 - (start.h + start.m / 60);
  const height = durationHours * CELL_HEIGHT_PX - 4; // -4 for padding/gap (matches legacy)
  const topOffset = (start.m / 60) * CELL_HEIGHT_PX + 2; // +2 matches legacy

  const title = [
    course.name,
    `${slot.start} - ${slot.end}`,
    course.location || '',
  ]
    .filter(Boolean)
    .join('\n');

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      class="schedule-block"
      title={title}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={{
        top: `${String(topOffset)}px`,
        height: `${String(height)}px`,
        ...(course.color ? { backgroundColor: course.color } : {}),
      }}
    >
      {course.name}
    </div>
  );
}
