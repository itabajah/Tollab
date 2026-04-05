/**
 * Barrel re-export for all Tollab utility functions.
 */

// DOM utilities
export {
  escapeHtml,
  getInputChecked,
  getInputValue,
  getSelectValue,
  getTextAreaValue,
  handleKeyActivate,
} from './dom';

// Date utilities
export {
  convertDateFormat,
  getCurrentWeekRange,
  getDayOfWeekFromDate,
  isDateInCurrentWeek,
  parseDate,
  parseICSDate,
  startOfDay,
} from './date';

// Color utilities
export {
  extractHueFromColor,
  generateCourseColor,
  getNextAvailableHue,
} from './color';

// String utilities
export { generateId, truncate } from './string';

// Semester utilities
export { compareSemesters, extractYear, getSeasonValue } from './semester';

// Video utilities
export {
  detectVideoPlatform,
  getVideoEmbedInfo,
  supportsInlinePreview,
} from './video';
export type { VideoEmbedInfo, VideoPlatform } from './video';

// Error handling
export {
  calculateBackoffDelay,
  extractErrorCode,
  getUserFriendlyError,
  isRetryableError,
  safeExecute,
  withRetry,
} from './error-handling';
export type { RetryInfo, RetryOptions } from './error-handling';

// ICS parser
export { parseICS } from './ics-parser';
export type {
  ParsedICSEvent,
  ParsedICSScheduleSlot,
} from './ics-parser';
