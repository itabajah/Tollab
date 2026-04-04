/**
 * TimeGrid — vertical time axis labels and horizontal day headers for the weekly schedule.
 *
 * Renders the CSS Grid structure: a time column on the left, day header row across the top,
 * and empty schedule cells for each day/hour intersection. EventChips and CurrentTimeLine
 * are rendered inside the cells by the parent WeeklySchedule component.
 */

import type { ComponentChildren } from 'preact';

import type { CalendarSettings } from '@/types';

// ---------------------------------------------------------------------------
// Day labels (Sunday-first, matching legacy code)
// ---------------------------------------------------------------------------

const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TimeGridProps {
  settings: CalendarSettings;
  /** Override visible days (e.g. single-day mobile filter). */
  visibleDaysOverride?: number[];
  /** Render function that returns chips/lines to place inside a specific cell. */
  cellContent?: (day: number, hour: number) => ComponentChildren;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeGrid({
  settings,
  visibleDaysOverride,
  cellContent,
}: TimeGridProps) {
  const { startHour, endHour } = settings;
  const visibleDays = visibleDaysOverride ?? settings.visibleDays;

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  const gridTemplateColumns = `40px repeat(${String(visibleDays.length)}, 1fr)`;

  return (
    <div
      class="weekly-schedule"
      style={{ gridTemplateColumns }}
    >
      {/* Corner cell */}
      <div class="schedule-header" />

      {/* Day headers */}
      {visibleDays.map((dIndex) => (
        <div key={`hdr-${String(dIndex)}`} class="schedule-header">
          {ALL_DAYS[dIndex]}
        </div>
      ))}

      {/* Hour rows */}
      {hours.map((h) => (
        <>
          {/* Time label */}
          <div key={`time-${String(h)}`} class="schedule-time-col">
            {String(h)}:00
          </div>

          {/* Day cells for this hour */}
          {visibleDays.map((dIndex) => (
            <div
              key={`cell-${String(dIndex)}-${String(h)}`}
              class="schedule-cell"
              data-day={dIndex}
              data-hour={h}
            >
              {cellContent?.(dIndex, h)}
            </div>
          ))}
        </>
      ))}
    </div>
  );
}
