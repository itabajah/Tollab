/**
 * Tests for barrel export files and type guards.
 * Covers the 0% coverage barrel exports + type runtime guards.
 */

import { describe, it, expect } from 'vitest';

// -- Calendar barrel --
import {
  WeeklySchedule,
  TimeGrid,
  EventChip,
  CurrentTimeLine,
  useTimeLineCell,
} from '@/components/calendar';

describe('calendar barrel exports', () => {
  it('exports WeeklySchedule', () => {
    expect(WeeklySchedule).toBeDefined();
  });
  it('exports TimeGrid', () => {
    expect(TimeGrid).toBeDefined();
  });
  it('exports EventChip', () => {
    expect(EventChip).toBeDefined();
  });
  it('exports CurrentTimeLine', () => {
    expect(CurrentTimeLine).toBeDefined();
  });
  it('exports useTimeLineCell', () => {
    expect(useTimeLineCell).toBeDefined();
  });
});

// -- Recordings barrel --
import {
  RecordingEditor,
  RecordingItem,
  RecordingsPanel,
  RecordingsTabs,
  VideoPreview,
} from '@/components/recordings';

describe('recordings barrel exports', () => {
  it('exports RecordingEditor', () => {
    expect(RecordingEditor).toBeDefined();
  });
  it('exports RecordingItem', () => {
    expect(RecordingItem).toBeDefined();
  });
  it('exports RecordingsPanel', () => {
    expect(RecordingsPanel).toBeDefined();
  });
  it('exports RecordingsTabs', () => {
    expect(RecordingsTabs).toBeDefined();
  });
  it('exports VideoPreview', () => {
    expect(VideoPreview).toBeDefined();
  });
});

// -- Settings barrel --
import {
  ProfileTab,
  AppearanceTab,
  CalendarTab,
  FetchDataTab,
} from '@/components/settings';

describe('settings barrel exports', () => {
  it('exports ProfileTab', () => {
    expect(ProfileTab).toBeDefined();
  });
  it('exports AppearanceTab', () => {
    expect(AppearanceTab).toBeDefined();
  });
  it('exports CalendarTab', () => {
    expect(CalendarTab).toBeDefined();
  });
  it('exports FetchDataTab', () => {
    expect(FetchDataTab).toBeDefined();
  });
});

// -- Store barrel --
import {
  useAppStore,
  useProfileStore,
  useUiStore,
  useCurrentSemester,
  useCourseById,
  useAllCourses,
  useHomeworkByUrgency,
  useCourseProgress,
  useSortedRecordings,
  useSortedHomework,
} from '@/store';

describe('store barrel exports', () => {
  it('exports useAppStore', () => {
    expect(useAppStore).toBeDefined();
  });
  it('exports useProfileStore', () => {
    expect(useProfileStore).toBeDefined();
  });
  it('exports useUiStore', () => {
    expect(useUiStore).toBeDefined();
  });
  it('exports selector hooks', () => {
    expect(useCurrentSemester).toBeDefined();
    expect(useCourseById).toBeDefined();
    expect(useAllCourses).toBeDefined();
    expect(useHomeworkByUrgency).toBeDefined();
    expect(useCourseProgress).toBeDefined();
    expect(useSortedRecordings).toBeDefined();
    expect(useSortedHomework).toBeDefined();
  });
});

// -- Services barrel --
import {
  fetchICSData,
  parseICSToSemesters,
  batchImportSemesters,
  ProxyFetchError,
  initAuth,
  onAuthStateChange,
  getCurrentUser,
  isFirebaseConfigured,
  buildLocalPayload,
  mergeLocalAndCloud,
  parsePanoptoClipboard,
  parsePanoptoHtmlFile,
  saveToLocalStorage,
  loadFromLocalStorage,
  saveProfileList,
  loadProfileList,
  saveSettings,
  loadSettings,
  deleteProfileData,
  getStorageUsage,
  exportAllData,
  importData,
  initStorePersistence,
  fetchSemesterList,
  buildCourseCatalog,
  enrichCourseWithMetadata,
  enrichCoursesWithCatalog,
  fetchYouTubePlaylist,
} from '@/services';

describe('services barrel exports', () => {
  it('exports cheesefork functions', () => {
    expect(fetchICSData).toBeDefined();
    expect(parseICSToSemesters).toBeDefined();
    expect(batchImportSemesters).toBeDefined();
  });
  it('exports cors proxy', () => {
    expect(ProxyFetchError).toBeDefined();
  });
  it('exports firebase auth', () => {
    expect(initAuth).toBeDefined();
    expect(onAuthStateChange).toBeDefined();
    expect(getCurrentUser).toBeDefined();
  });
  it('exports firebase config', () => {
    expect(isFirebaseConfigured).toBeDefined();
  });
  it('exports firebase sync', () => {
    expect(buildLocalPayload).toBeDefined();
    expect(mergeLocalAndCloud).toBeDefined();
  });
  it('exports panopto', () => {
    expect(parsePanoptoClipboard).toBeDefined();
    expect(parsePanoptoHtmlFile).toBeDefined();
  });
  it('exports storage functions', () => {
    expect(saveToLocalStorage).toBeDefined();
    expect(loadFromLocalStorage).toBeDefined();
    expect(saveProfileList).toBeDefined();
    expect(loadProfileList).toBeDefined();
    expect(saveSettings).toBeDefined();
    expect(loadSettings).toBeDefined();
    expect(deleteProfileData).toBeDefined();
    expect(getStorageUsage).toBeDefined();
    expect(exportAllData).toBeDefined();
    expect(importData).toBeDefined();
  });
  it('exports store persistence', () => {
    expect(initStorePersistence).toBeDefined();
  });
  it('exports technion catalog', () => {
    expect(fetchSemesterList).toBeDefined();
    expect(buildCourseCatalog).toBeDefined();
    expect(enrichCourseWithMetadata).toBeDefined();
    expect(enrichCoursesWithCatalog).toBeDefined();
  });
  it('exports youtube', () => {
    expect(fetchYouTubePlaylist).toBeDefined();
  });
});

// -- Utils barrel --
import {
  escapeHtml,
  getInputChecked,
  getInputValue as getInputVal,
  getSelectValue as getSelectVal,
  getTextAreaValue as getTextAreaVal,
  handleKeyActivate as handleKey,
  convertDateFormat,
  getCurrentWeekRange,
  getDayOfWeekFromDate,
  isDateInCurrentWeek,
  parseDate,
  parseICSDate,
  startOfDay,
  extractHueFromColor,
  generateCourseColor,
  getNextAvailableHue,
  generateId,
  truncate,
  compareSemesters,
  extractYear,
  getSeasonValue,
  detectVideoPlatform,
  getVideoEmbedInfo,
  supportsInlinePreview,
  calculateBackoffDelay,
  extractErrorCode,
  getUserFriendlyError,
  isRetryableError,
  safeExecute,
  withRetry,
  parseICS,
} from '@/utils';

describe('utils barrel exports', () => {
  it('exports DOM utils', () => {
    expect(escapeHtml).toBeDefined();
    expect(getInputChecked).toBeDefined();
    expect(getInputVal).toBeDefined();
    expect(getSelectVal).toBeDefined();
    expect(getTextAreaVal).toBeDefined();
    expect(handleKey).toBeDefined();
  });
  it('exports date utils', () => {
    expect(convertDateFormat).toBeDefined();
    expect(getCurrentWeekRange).toBeDefined();
    expect(getDayOfWeekFromDate).toBeDefined();
    expect(isDateInCurrentWeek).toBeDefined();
    expect(parseDate).toBeDefined();
    expect(parseICSDate).toBeDefined();
    expect(startOfDay).toBeDefined();
  });
  it('exports color utils', () => {
    expect(extractHueFromColor).toBeDefined();
    expect(generateCourseColor).toBeDefined();
    expect(getNextAvailableHue).toBeDefined();
  });
  it('exports string utils', () => {
    expect(generateId).toBeDefined();
    expect(truncate).toBeDefined();
  });
  it('exports semester utils', () => {
    expect(compareSemesters).toBeDefined();
    expect(extractYear).toBeDefined();
    expect(getSeasonValue).toBeDefined();
  });
  it('exports video utils', () => {
    expect(detectVideoPlatform).toBeDefined();
    expect(getVideoEmbedInfo).toBeDefined();
    expect(supportsInlinePreview).toBeDefined();
  });
  it('exports error handling utils', () => {
    expect(calculateBackoffDelay).toBeDefined();
    expect(extractErrorCode).toBeDefined();
    expect(getUserFriendlyError).toBeDefined();
    expect(isRetryableError).toBeDefined();
    expect(safeExecute).toBeDefined();
    expect(withRetry).toBeDefined();
  });
  it('exports ICS parser', () => {
    expect(parseICS).toBeDefined();
  });
});

// -- Type guards from settings.ts --
import { isRecordingSortOrder, isHomeworkSortOrder } from '@/types/settings';

describe('settings type guards', () => {
  describe('isRecordingSortOrder', () => {
    it('returns true for valid recording sort orders', () => {
      expect(isRecordingSortOrder('default')).toBe(true);
      expect(isRecordingSortOrder('manual')).toBe(true);
      expect(isRecordingSortOrder('name_asc')).toBe(true);
      expect(isRecordingSortOrder('name_desc')).toBe(true);
      expect(isRecordingSortOrder('watched_first')).toBe(true);
      expect(isRecordingSortOrder('unwatched_first')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isRecordingSortOrder('invalid')).toBe(false);
      expect(isRecordingSortOrder('')).toBe(false);
      expect(isRecordingSortOrder(null)).toBe(false);
      expect(isRecordingSortOrder(undefined)).toBe(false);
      expect(isRecordingSortOrder(42)).toBe(false);
    });
  });

  describe('isHomeworkSortOrder', () => {
    it('returns true for valid homework sort orders', () => {
      expect(isHomeworkSortOrder('manual')).toBe(true);
      expect(isHomeworkSortOrder('date_asc')).toBe(true);
      expect(isHomeworkSortOrder('date_desc')).toBe(true);
      expect(isHomeworkSortOrder('completed_first')).toBe(true);
      expect(isHomeworkSortOrder('incomplete_first')).toBe(true);
      expect(isHomeworkSortOrder('name_asc')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isHomeworkSortOrder('bogus')).toBe(false);
      expect(isHomeworkSortOrder('')).toBe(false);
      expect(isHomeworkSortOrder(null)).toBe(false);
      expect(isHomeworkSortOrder(undefined)).toBe(false);
      expect(isHomeworkSortOrder(123)).toBe(false);
    });
  });
});
