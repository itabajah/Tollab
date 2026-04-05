/**
 * Barrel re-export for all Tollab type definitions.
 */

// Domain models
export type { Semester, CalendarSettings } from './semester';
export { DEFAULT_CALENDAR_SETTINGS } from './semester';

export type {
  Course,
  CourseRecordings,
  ExamEntry,
  ScheduleSlot,
} from './course';

export type { RecordingItem, RecordingTab } from './recording';

export type { Homework, HomeworkLink } from './homework';

export type { Profile, ProfileData } from './profile';

// Settings & themes
export type {
  AppSettings,
  HomeworkSortOrder,
  RecordingSortOrder,
} from './settings';
export { ColorTheme, ThemeMode, isHomeworkSortOrder, isRecordingSortOrder } from './settings';

// Validation
export type {
  DateValidationResult,
  ImportValidationResult,
  ValidationResult,
  VideoUrlResult,
} from './validation';

// Toast
export type { ToastOptions } from './toast';
export { ToastType } from './toast';

// Header ticker
export type {
  TickerCategory,
  TickerContext,
  TickerKind,
  TickerTemplateMap,
  TickerTemplateVars,
} from './ticker';

// Firebase sync & cloud
export type {
  CloudPayload,
  CloudProfileEntry,
  SyncConflictInfo,
  SyncConflictResolution,
} from './sync';
export { FirebaseSyncState } from './sync';
