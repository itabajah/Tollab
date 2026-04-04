/**
 * Semester and calendar types for the Tollab academic management app.
 */

/** Calendar display settings for a semester's weekly schedule view. */
export interface CalendarSettings {
  /** Start hour for the calendar grid (0-23). */
  startHour: number;
  /** End hour for the calendar grid (0-23). */
  endHour: number;
  /** Visible day indices (0=Sunday through 6=Saturday). */
  visibleDays: number[];
}

/** Default calendar settings applied to new semesters. */
export const DEFAULT_CALENDAR_SETTINGS: Readonly<CalendarSettings> =
  Object.freeze({
    startHour: 8,
    endHour: 20,
    visibleDays: [0, 1, 2, 3, 4, 5],
  });

/** A single academic semester containing courses and calendar configuration. */
export interface Semester {
  /** Unique identifier. */
  id: string;
  /** Display name (e.g. "Winter 2024-2025", "Spring 2025"). */
  name: string;
  /** Courses enrolled in this semester. */
  courses: import('./course').Course[];
  /** Per-semester calendar display configuration. */
  calendarSettings: CalendarSettings;
}
