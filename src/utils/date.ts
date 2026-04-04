/**
 * Date utility functions — format conversion, ICS parsing, week-range helpers.
 */

/**
 * Converts a date string from `dd-MM-yyyy` to `yyyy-MM-dd` format.
 * Returns the original string unchanged if it doesn't match the expected pattern.
 */
export function convertDateFormat(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return dateStr;
}

/**
 * Parses an ICS date string (e.g. `20241027T103000` or `20241027T103000Z`)
 * into a JavaScript `Date` object. UTC dates (Z suffix) use `Date.UTC`.
 */
export function parseICSDate(icsDate: string): Date {
  const year = parseInt(icsDate.substring(0, 4), 10);
  const month = parseInt(icsDate.substring(4, 6), 10) - 1;
  const day = parseInt(icsDate.substring(6, 8), 10);
  const hour = parseInt(icsDate.substring(9, 11), 10);
  const minute = parseInt(icsDate.substring(11, 13), 10);
  const second = parseInt(icsDate.substring(13, 15), 10);

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Returns the start (Sunday 00:00:00) and end (Saturday 23:59:59.999) of the
 * current week.
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { start: startOfWeek, end: endOfWeek };
}

/**
 * Checks whether a `yyyy-MM-dd` date string falls within the current week
 * (Sunday through Saturday).
 */
export function isDateInCurrentWeek(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const { start, end } = getCurrentWeekRange();
  return date >= start && date <= end;
}

/**
 * Returns the day of week (0 = Sunday … 6 = Saturday) for a `yyyy-MM-dd`
 * date string, or `-1` if the input is empty/invalid.
 */
export function getDayOfWeekFromDate(dateStr: string): number {
  if (!dateStr) return -1;
  return new Date(dateStr).getDay();
}
