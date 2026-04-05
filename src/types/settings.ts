/**
 * Settings, theme, and sort order types for the Tollab academic management app.
 */

// ---------------------------------------------------------------------------
// Theme types
// ---------------------------------------------------------------------------

/** Color theme for course cards. */
export enum ColorTheme {
  /** Each course gets a distinct hue via golden angle distribution. */
  Colorful = 'colorful',
  /** All courses use shades around a configurable base hue. */
  Single = 'single',
  /** All courses are grayscale. */
  Mono = 'mono',
}

/** Light/dark mode. */
export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
}

// ---------------------------------------------------------------------------
// Sort order types (discriminated unions)
// ---------------------------------------------------------------------------

/** Sort orders available for recording lists. */
export type RecordingSortOrder =
  | 'default'
  | 'manual'
  | 'name_asc'
  | 'name_desc'
  | 'watched_first'
  | 'unwatched_first';

/** All valid RecordingSortOrder values for runtime validation. */
const RECORDING_SORT_ORDER_VALUES: readonly string[] = [
  'default', 'manual', 'name_asc', 'name_desc', 'watched_first', 'unwatched_first',
];

/** Runtime type guard for RecordingSortOrder. */
export function isRecordingSortOrder(value: unknown): value is RecordingSortOrder {
  return typeof value === 'string' && RECORDING_SORT_ORDER_VALUES.includes(value);
}

/** Sort orders available for homework lists. */
export type HomeworkSortOrder =
  | 'manual'
  | 'date_asc'
  | 'date_desc'
  | 'completed_first'
  | 'incomplete_first'
  | 'name_asc';

/** All valid HomeworkSortOrder values for runtime validation. */
const HOMEWORK_SORT_ORDER_VALUES: readonly string[] = [
  'manual', 'date_asc', 'date_desc', 'completed_first', 'incomplete_first', 'name_asc',
];

/** Runtime type guard for HomeworkSortOrder. */
export function isHomeworkSortOrder(value: unknown): value is HomeworkSortOrder {
  return typeof value === 'string' && HOMEWORK_SORT_ORDER_VALUES.includes(value);
}

// ---------------------------------------------------------------------------
// Application settings
// ---------------------------------------------------------------------------

/** Application display and behavior settings. */
export interface AppSettings {
  /** Light or dark mode. */
  theme: ThemeMode | string;
  /** Whether to show completed homework items in lists. */
  showCompleted: boolean;
  /** Whether to show watched recordings in lists. */
  showWatchedRecordings: boolean;
  /** Color theme for course cards. */
  colorTheme: ColorTheme | string;
  /** Base hue (0-360) for monochromatic color theme. */
  baseColorHue: number;
}
