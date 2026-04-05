/**
 * Calendar settings tab.
 *
 * Features:
 * - Start hour / end hour inputs (0-23)
 * - Visible days checkboxes (Sun-Sat)
 */

import { useCallback } from 'preact/hooks';

import { useAppStore } from '@/store/app-store';
import { DAY_NAMES } from '@/constants';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarTab() {
  const semesters = useAppStore((s) => s.semesters);
  const currentSemesterId = useAppStore((s) => s.currentSemesterId);
  const updateCalendarSettings = useAppStore((s) => s.updateCalendarSettings);

  const currentSemester = semesters.find((s) => s.id === currentSemesterId);
  const calendarSettings = currentSemester?.calendarSettings ?? {
    startHour: 8,
    endHour: 20,
    visibleDays: [0, 1, 2, 3, 4, 5],
  };

  const handleStartHourChange = useCallback(
    (e: Event) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val) && val >= 0 && val <= 23 && currentSemesterId) {
        updateCalendarSettings(currentSemesterId, { startHour: val });
      }
    },
    [currentSemesterId, updateCalendarSettings],
  );

  const handleEndHourChange = useCallback(
    (e: Event) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val) && val >= 0 && val <= 23 && currentSemesterId) {
        updateCalendarSettings(currentSemesterId, { endHour: val });
      }
    },
    [currentSemesterId, updateCalendarSettings],
  );

  const handleDayToggle = useCallback(
    (dayIndex: number) => {
      if (!currentSemesterId) return;

      const current = calendarSettings.visibleDays;
      const isVisible = current.includes(dayIndex);

      // Must keep at least one day visible
      if (isVisible && current.length <= 1) return;

      const next = isVisible
        ? current.filter((d) => d !== dayIndex)
        : [...current, dayIndex].sort((a, b) => a - b);

      updateCalendarSettings(currentSemesterId, { visibleDays: next });
    },
    [currentSemesterId, calendarSettings.visibleDays, updateCalendarSettings],
  );

  if (!currentSemester) {
    return (
      <div class="settings-tab-content">
        <p class="settings-description">
          No semester selected. Add a semester first to configure calendar settings.
        </p>
      </div>
    );
  }

  return (
    <div class="settings-tab-content">
      <h3 class="settings-section-title">Calendar Configuration</h3>

      {/* Start / End Hour */}
      <div class="form-row">
        <div class="form-group">
          <label htmlFor="cal-start-hour">Start Hour (0-23)</label>
          <input
            type="number"
            id="cal-start-hour"
            min="0"
            max="23"
            value={calendarSettings.startHour}
            onInput={handleStartHourChange}
          />
        </div>
        <div class="form-group">
          <label htmlFor="cal-end-hour">End Hour (0-23)</label>
          <input
            type="number"
            id="cal-end-hour"
            min="0"
            max="23"
            value={calendarSettings.endHour}
            onInput={handleEndHourChange}
          />
        </div>
      </div>

      {/* Visible Days */}
      <div class="form-group">
        <label>Visible Days</label>
        <div class="settings-days-container">
          {DAY_NAMES.map((name, index) => (
            <label
              key={index}
              class="settings-day-checkbox"
            >
              <input
                type="checkbox"
                checked={calendarSettings.visibleDays.includes(index)}
                onChange={() => handleDayToggle(index)}
              />
              {name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
