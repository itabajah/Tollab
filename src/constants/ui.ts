/**
 * UI-related constants: animations, timers, truncation, recordings defaults.
 */

import type { RecordingTab } from '@/types';

/** Animation durations in milliseconds. */
export const ANIMATION_DURATIONS = Object.freeze({
  /** Modal open/close transition. */
  MODAL_TRANSITION: 300,
  /** Highlight pulse for newly added items. */
  HIGHLIGHT_PULSE: 1500,
  /** Delay after a successful fetch before closing the modal. */
  FETCH_SUCCESS_DELAY: 1500,
} as const);

/** Interval in ms for updating the current-time line on the calendar. */
export const TIME_UPDATE_INTERVAL = 60_000 as const;

/** Maximum display lengths for truncation. */
export const MAX_LENGTHS = Object.freeze({
  /** Max characters for calendar event chip titles. */
  EVENT_CHIP_TITLE: 12,
  /** Max homework links shown in the sidebar. */
  SIDEBAR_LINKS_DISPLAY: 3,
  /** Initial number of links shown before "show more". */
  SIDEBAR_LINKS_INITIAL: 2,
} as const);

/** Default recording tabs created for every new course. */
export const DEFAULT_RECORDING_TABS: readonly Readonly<
  Pick<RecordingTab, 'id' | 'name'>
>[] = Object.freeze([
  Object.freeze({ id: 'lectures', name: 'Lectures' }),
  Object.freeze({ id: 'tutorials', name: 'Tutorials' }),
]);

/** Tab IDs that cannot be deleted by the user. */
export const PROTECTED_TAB_IDS: ReadonlySet<string> = new Set([
  'lectures',
  'tutorials',
]);

/** Toast notification configuration. */
export const TOAST_CONFIG = Object.freeze({
  /** Default auto-dismiss duration in ms. */
  DEFAULT_DURATION: 4000,
  /** Auto-dismiss duration for error toasts in ms. */
  ERROR_DURATION: 6000,
  /** Maximum number of toasts visible simultaneously. */
  MAX_VISIBLE: 5,
  /** Slide in/out animation duration in ms. */
  ANIMATION_DURATION: 300,
  /** Position of the toast container. */
  POSITION: 'bottom-right',
} as const);

/** Header ticker rotation interval in milliseconds. */
export const HEADER_TICKER_ROTATE_MS = 9000 as const;

/** Maximum number of recent ticker items tracked to avoid repeats. */
export const HEADER_TICKER_RECENT_LIMIT = 5 as const;

/** Current export data version for migration handling. */
export const EXPORT_DATA_VERSION = 1 as const;

/** Mobile breakpoint width in pixels. */
export const MOBILE_BREAKPOINT = 768 as const;
