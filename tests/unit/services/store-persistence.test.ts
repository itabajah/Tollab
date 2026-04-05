import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { STORAGE_KEYS, DEFAULT_THEME_SETTINGS } from '@/constants';
import type { AppSettings, ProfileData } from '@/types';

// We need to import the stores and persistence AFTER setting up mocks
import { useAppStore } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';
import { initStorePersistence } from '@/services/store-persistence';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfileData(overrides?: Partial<ProfileData>): ProfileData {
  return {
    semesters: [],
    settings: { ...DEFAULT_THEME_SETTINGS },
    lastModified: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSettings(overrides?: Partial<AppSettings>): AppSettings {
  return { ...DEFAULT_THEME_SETTINGS, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('store-persistence', () => {
  let teardown: (() => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();

    // Reset stores to initial state
    useAppStore.getState().loadData({
      semesters: [],
      settings: { ...DEFAULT_THEME_SETTINGS },
    });
    useProfileStore.setState({
      profiles: [{ id: 'default', name: 'Default Profile' }],
      activeProfileId: 'default',
    });
  });

  afterEach(() => {
    if (teardown) {
      teardown();
      teardown = null;
    }
    vi.useRealTimers();
  });

  // =========================================================================
  // Bootstrap from localStorage
  // =========================================================================
  describe('initPersistence bootstraps from localStorage', () => {
    it('loads profile list from localStorage on init', () => {
      const profiles = [
        { id: 'p1', name: 'Profile 1' },
        { id: 'p2', name: 'Profile 2' },
      ];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(
        `${STORAGE_KEYS.DATA_PREFIX}p1`,
        JSON.stringify(makeProfileData({ lastModified: '2025-06-01T00:00:00Z' })),
      );

      teardown = initStorePersistence();

      expect(useProfileStore.getState().profiles).toHaveLength(2);
      expect(useProfileStore.getState().activeProfileId).toBe('p1');
    });

    it('loads active profile data into app store', () => {
      const profiles = [{ id: 'p1', name: 'Profile 1' }];
      const data = makeProfileData({
        semesters: [{
          id: 's1', name: 'Fall', courses: [],
          calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
        }],
        lastModified: '2025-06-01T00:00:00Z',
      });
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();

      expect(useAppStore.getState().semesters).toHaveLength(1);
      expect(useAppStore.getState().semesters[0]?.name).toBe('Fall');
    });

    it('falls back to first profile when active ID is invalid', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'nonexistent');
      localStorage.setItem(
        `${STORAGE_KEYS.DATA_PREFIX}p1`,
        JSON.stringify(makeProfileData()),
      );

      teardown = initStorePersistence();

      expect(useProfileStore.getState().activeProfileId).toBe('p1');
    });

    it('uses defaults when no profile list exists', () => {
      teardown = initStorePersistence();

      // Should keep the existing default profile
      expect(useProfileStore.getState().profiles).toHaveLength(1);
    });

    it('loads saved settings into app store for new profiles', () => {
      const savedSettings = makeSettings({ baseColorHue: 42 });
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(savedSettings));

      teardown = initStorePersistence();

      // For a new profile (no data), settings come from loadSettings()
      expect(useAppStore.getState().settings.baseColorHue).toBe(42);
    });

    it('loads UI state (sort orders, currentSemesterId) from localStorage', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      const data = makeProfileData({
        semesters: [{
          id: 's1', name: 'Fall', courses: [],
          calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
        }],
      });
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));
      localStorage.setItem(
        'tollab_ui_p1',
        JSON.stringify({ currentSemesterId: 's1', recordingSortOrders: {}, homeworkSortOrders: {} }),
      );

      teardown = initStorePersistence();

      expect(useAppStore.getState().currentSemesterId).toBe('s1');
    });
  });

  // =========================================================================
  // Auto-save triggers on store changes
  // =========================================================================
  describe('auto-save triggers on store changes', () => {
    it('saves app data to localStorage after debounce', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(makeProfileData()));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();

      // Trigger a change in app store
      useAppStore.getState().addSemester('New Semester');

      // Before debounce fires, data should not be updated yet
      const beforeRaw = localStorage.getItem(`${STORAGE_KEYS.DATA_PREFIX}p1`);
      const before = beforeRaw ? JSON.parse(beforeRaw) as ProfileData : null;
      expect(before?.semesters).toHaveLength(0);

      // Advance past the 500ms debounce
      vi.advanceTimersByTime(600);

      // Now it should be saved
      const afterRaw = localStorage.getItem(`${STORAGE_KEYS.DATA_PREFIX}p1`);
      const after = afterRaw ? JSON.parse(afterRaw) as ProfileData : null;
      expect(after?.semesters).toHaveLength(1);
    });

    it('saves profile list when profiles change', () => {
      teardown = initStorePersistence();

      useProfileStore.getState().createProfile('New Profile');

      const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
      const profiles = saved ? JSON.parse(saved) as Array<{ id: string; name: string }> : [];
      expect(profiles.length).toBeGreaterThanOrEqual(2);
    });

    it('saves settings separately for quick theme load', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(makeProfileData()));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();

      useAppStore.getState().updateSettings({ baseColorHue: 123 });

      vi.advanceTimersByTime(600);

      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const saved = raw ? JSON.parse(raw) as AppSettings : null;
      expect(saved?.baseColorHue).toBe(123);
    });
  });

  // =========================================================================
  // Debounce behavior
  // =========================================================================
  describe('debounce behavior', () => {
    it('multiple rapid changes result in a single save', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(makeProfileData()));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const callsBefore = setItemSpy.mock.calls.length;

      // Make 5 rapid changes
      useAppStore.getState().addSemester('S1');
      useAppStore.getState().addSemester('S2');
      useAppStore.getState().addSemester('S3');
      useAppStore.getState().addSemester('S4');
      useAppStore.getState().addSemester('S5');

      // Advance 100ms — should not have saved yet
      vi.advanceTimersByTime(100);

      // Advance past debounce
      vi.advanceTimersByTime(500);

      // Count profile data writes (the DATA_PREFIX key)
      const dataWrites = setItemSpy.mock.calls
        .slice(callsBefore)
        .filter(([key]) => typeof key === 'string' && key.startsWith(STORAGE_KEYS.DATA_PREFIX));

      // Should only have 1 write for all 5 changes
      expect(dataWrites).toHaveLength(1);

      setItemSpy.mockRestore();
    });

    it('debounce timer resets on each change', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(makeProfileData()));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();

      useAppStore.getState().addSemester('S1');
      vi.advanceTimersByTime(400); // 400ms < 500ms debounce

      // Another change resets the timer
      useAppStore.getState().addSemester('S2');
      vi.advanceTimersByTime(400); // 400ms from last change

      // Should still not have saved (only 400ms from last change)
      const raw = localStorage.getItem(`${STORAGE_KEYS.DATA_PREFIX}p1`);
      const data = raw ? JSON.parse(raw) as ProfileData : null;
      expect(data?.semesters).toHaveLength(0); // still original

      // Now advance past the debounce
      vi.advanceTimersByTime(200);
      const raw2 = localStorage.getItem(`${STORAGE_KEYS.DATA_PREFIX}p1`);
      const data2 = raw2 ? JSON.parse(raw2) as ProfileData : null;
      expect(data2?.semesters).toHaveLength(2); // both saved
    });
  });

  // =========================================================================
  // Cleanup / teardown
  // =========================================================================
  describe('cleanup / teardown', () => {
    it('returns an unsubscribe function', () => {
      teardown = initStorePersistence();
      expect(typeof teardown).toBe('function');
    });

    it('unsubscribing stops auto-save', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(makeProfileData()));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();
      teardown();
      teardown = null;

      // Changes after teardown should NOT be saved
      useAppStore.getState().addSemester('After Teardown');
      vi.advanceTimersByTime(600);

      const raw = localStorage.getItem(`${STORAGE_KEYS.DATA_PREFIX}p1`);
      const data = raw ? JSON.parse(raw) as ProfileData : null;
      expect(data?.semesters).toHaveLength(0); // unchanged
    });

    it('clears pending timers on teardown', () => {
      const profiles = [{ id: 'p1', name: 'P1' }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(makeProfileData()));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();

      // Trigger a change (starts debounce timer)
      useAppStore.getState().addSemester('Pending');

      // Teardown before timer fires
      teardown();
      teardown = null;

      // Even after debounce time passes, should not save
      vi.advanceTimersByTime(1000);

      const raw = localStorage.getItem(`${STORAGE_KEYS.DATA_PREFIX}p1`);
      const data = raw ? JSON.parse(raw) as ProfileData : null;
      expect(data?.semesters).toHaveLength(0);
    });

    it('profile switch loads new profile data', () => {
      const profiles = [
        { id: 'p1', name: 'P1' },
        { id: 'p2', name: 'P2' },
      ];
      const data2 = makeProfileData({
        semesters: [{
          id: 's2', name: 'P2 Semester', courses: [],
          calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
        }],
      });
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, 'p1');
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p1`, JSON.stringify(makeProfileData()));
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}p2`, JSON.stringify(data2));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(makeSettings()));

      teardown = initStorePersistence();

      // Switch to p2
      useProfileStore.getState().switchProfile('p2');

      expect(useAppStore.getState().semesters).toHaveLength(1);
      expect(useAppStore.getState().semesters[0]?.name).toBe('P2 Semester');
    });
  });
});
