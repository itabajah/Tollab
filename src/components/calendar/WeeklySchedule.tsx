/**
 * WeeklySchedule — main calendar component.
 *
 * Composes TimeGrid, EventChip, and CurrentTimeLine into the full weekly
 * schedule view. Reads courses and calendar settings from the Zustand store.
 *
 * Mobile behaviour: a toggle button switches between all-days and single-day
 * (today only) mode, mirroring the legacy `#mobile-day-toggle` button.
 */

import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';

import { MOBILE_BREAKPOINT } from '@/constants/ui';
import { useAppStore } from '@/store/app-store';
import { useCurrentSemester } from '@/store/selectors';
import { DEFAULT_CALENDAR_SETTINGS } from '@/constants';

import { CurrentTimeLine, useTimeLineCell } from './CurrentTimeLine';
import { EventChip } from './EventChip';
import { TimeGrid } from './TimeGrid';

// ---------------------------------------------------------------------------
// SVG icon (matches legacy index.legacy.html #mobile-day-toggle icon)
// ---------------------------------------------------------------------------

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDayIndex(): number {
  return new Date().getDay();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeeklySchedule() {
  const semester = useCurrentSemester();
  const courses = useAppStore((s) => {
    const sem = s.semesters.find((x) => x.id === s.currentSemesterId);
    return sem?.courses ?? [];
  });

  const settings = semester?.calendarSettings ?? DEFAULT_CALENDAR_SETTINGS;

  // -- Mobile single-day toggle state ---------------------------------------

  const [singleDay, setSingleDay] = useState(false);
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);

  // Initialise from viewport width on mount
  useEffect(() => {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    setSingleDay(isMobile);
  }, []);

  // Listen for resize — auto-clear single-day on desktop
  const RESIZE_DEBOUNCE_MS = 250;
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const nowMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        if (!nowMobile) setSingleDay(false);
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', handler);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handler);
    };
  }, []);

  const handleToggleDay = useCallback(() => {
    setSingleDay((prev) => !prev);
  }, []);

  const handleToggleCalendar = useCallback(() => {
    setCalendarCollapsed((prev) => !prev);
  }, []);

  const visibleDays = singleDay ? [todayDayIndex()] : undefined;

  // -- Build a lookup: (day, hour) → EventChip[] ---------------------------

  const chipsByCell = useMemo(() => {
    const map = new Map<string, { course: typeof courses[number]; slot: typeof courses[number]['schedule'][number] }[]>();
    for (const course of courses) {
      for (const slot of course.schedule) {
        const effectiveDays = visibleDays ?? settings.visibleDays;
        if (!effectiveDays.includes(slot.day)) continue;

        const parts = slot.start.split(':');
        const startH = Number(parts[0]);
        if (startH < settings.startHour || startH > settings.endHour) continue;

        const key = `${String(slot.day)}-${String(startH)}`;
        let arr = map.get(key);
        if (!arr) {
          arr = [];
          map.set(key, arr);
        }
        arr.push({ course, slot });
      }
    }
    return map;
  }, [courses, settings, visibleDays]);

  // -- Current time line position ------------------------------------------

  const timeLineCell = useTimeLineCell(settings, visibleDays);

  // -- Cell content renderer -----------------------------------------------

  const cellContent = useCallback(
    (day: number, hour: number) => {
      const key = `${String(day)}-${String(hour)}`;
      const entries = chipsByCell.get(key);

      const showTimeLine =
        timeLineCell !== null &&
        timeLineCell.day === day &&
        timeLineCell.hour === hour;

      if (!entries && !showTimeLine) return null;

      return (
        <>
          {entries?.map((e, i) => (
            <EventChip
              key={`${e.course.id}-${String(i)}`}
              course={e.course}
              slot={e.slot}
            />
          ))}
          {showTimeLine && (
            <CurrentTimeLine
              settings={settings}
              visibleDaysOverride={visibleDays}
            />
          )}
        </>
      );
    },
    [chipsByCell, timeLineCell, settings, visibleDays],
  );

  // -- No-courses placeholder -----------------------------------------------

  const hasCourses = courses.length > 0;
  const hasSlots = chipsByCell.size > 0;

  // -- Render ---------------------------------------------------------------

  return (
    <>
      {/* Header row — title + mobile toggle */}
      <div class="schedule-section-header">
        <h2 class="schedule-section-title">Weekly Schedule</h2>
        <div class="schedule-section-actions">
          <button
            id="mobile-day-toggle"
            title="Toggle Single Day View"
            class={singleDay ? 'active' : ''}
            onClick={handleToggleDay}
          >
            <CalendarIcon />
            <span>{singleDay ? 'Today' : 'All Days'}</span>
          </button>
          <button
            id="toggle-calendar-btn"
            class="icon-btn"
            title="Toggle Calendar"
            aria-label={calendarCollapsed ? 'Expand calendar' : 'Collapse calendar'}
            onClick={handleToggleCalendar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class={`collapse-chevron${calendarCollapsed ? ' collapse-chevron-rotated' : ''}`}
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid wrapper */}
      {!calendarCollapsed && (
        <div
          class={`calendar-scroll-wrapper${singleDay ? ' single-day-mode' : ''}`}
        >
          {hasCourses && hasSlots ? (
            <TimeGrid
              settings={settings}
              visibleDaysOverride={visibleDays}
              cellContent={cellContent}
            />
          ) : (
            <div class="weekly-schedule">
              <div class="schedule-placeholder">No classes scheduled.</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
