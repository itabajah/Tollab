/**
 * CurrentTimeLine — red horizontal indicator at the current time.
 *
 * Renders inside a `.schedule-cell` as an absolutely-positioned element.
 * Updates every 60 seconds so the line tracks real time.
 *
 * Uses the `.current-time-line` CSS class from calendar.css.
 */

import { useEffect, useState } from 'preact/hooks';

import type { CalendarSettings } from '@/types';

// ---------------------------------------------------------------------------
// Hook: clock that ticks every minute
// ---------------------------------------------------------------------------

interface TimeState {
  day: number;
  hour: number;
  minute: number;
}

function useCurrentTime(): TimeState {
  const [time, setTime] = useState<TimeState>(() => {
    const now = new Date();
    return { day: now.getDay(), hour: now.getHours(), minute: now.getMinutes() };
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setTime({ day: now.getDay(), hour: now.getHours(), minute: now.getMinutes() });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CurrentTimeLineProps {
  settings: CalendarSettings;
  visibleDaysOverride?: number[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Returns null when the current day/hour is outside the visible range.
 * When visible, the parent WeeklySchedule places this inside the correct cell
 * via the `cellContent` callback in TimeGrid.
 *
 * This component is designed to be rendered *conditionally* by the parent:
 * `getTimeLineForCell(day, hour)` returns the element only for the matching cell.
 */
export function CurrentTimeLine({ settings, visibleDaysOverride }: CurrentTimeLineProps) {
  const { day, hour, minute } = useCurrentTime();
  const visibleDays = visibleDaysOverride ?? settings.visibleDays;
  const { startHour, endHour } = settings;

  if (!visibleDays.includes(day) || hour < startHour || hour > endHour) {
    return null;
  }

  // Position matches legacy: (minute/60)*100 %
  const topPercent = (minute / 60) * 100;

  return (
    <div
      class="current-time-line"
      style={{ top: `${String(topPercent)}%` }}
    />
  );
}

// ---------------------------------------------------------------------------
// Hook for parent to query current time cell
// ---------------------------------------------------------------------------

/** Returns the day/hour cell where the time line should appear (or null). */
export function useTimeLineCell(
  settings: CalendarSettings,
  visibleDaysOverride?: number[],
): { day: number; hour: number } | null {
  const { day, hour } = useCurrentTime();
  const visibleDays = visibleDaysOverride ?? settings.visibleDays;
  const { startHour, endHour } = settings;

  if (!visibleDays.includes(day) || hour < startHour || hour > endHour) {
    return null;
  }
  return { day, hour };
}
