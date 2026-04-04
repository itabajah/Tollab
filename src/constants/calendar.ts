/**
 * Calendar-related constants.
 */

import { DEFAULT_CALENDAR_SETTINGS } from '@/types';

// Re-export the default calendar settings from the type module
export { DEFAULT_CALENDAR_SETTINGS };

/** Abbreviated day names for calendar headers. */
export const DAY_NAMES = Object.freeze([
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const);

/** Full day names for forms and accessibility. */
export const DAY_NAMES_FULL = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const);

/** Short day names for compact display (same as DAY_NAMES). */
export const DAY_NAMES_SHORT = Object.freeze([
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const);
