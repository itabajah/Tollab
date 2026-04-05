import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
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
} from '@/services/storage';
import { STORAGE_KEYS, DEFAULT_THEME_SETTINGS } from '@/constants';
import type { AppSettings, Profile, ProfileData } from '@/types';
import { ThemeMode } from '@/types';

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

function makeProfile(id: string, name: string): Profile {
  return { id, name };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('storage service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // saveToLocalStorage / loadFromLocalStorage round-trip
  // =========================================================================
  describe('saveToLocalStorage / loadFromLocalStorage', () => {
    it('round-trips valid ProfileData', () => {
      const data = makeProfileData({ lastModified: '2025-06-01T12:00:00Z' });
      const result = saveToLocalStorage('prof1', data);
      expect(result.success).toBe(true);

      const loaded = loadFromLocalStorage('prof1');
      expect(loaded).toEqual(data);
    });

    it('returns null for a non-existent profile', () => {
      expect(loadFromLocalStorage('missing')).toBeNull();
    });

    it('returns null when stored data is invalid JSON', () => {
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}bad`, '{{not json');
      expect(loadFromLocalStorage('bad')).toBeNull();
    });

    it('returns null when stored data has wrong shape (missing semesters)', () => {
      localStorage.setItem(
        `${STORAGE_KEYS.DATA_PREFIX}wrong`,
        JSON.stringify({ settings: {}, lastModified: 'x' }),
      );
      expect(loadFromLocalStorage('wrong')).toBeNull();
    });

    it('returns null when stored data has wrong shape (missing settings)', () => {
      localStorage.setItem(
        `${STORAGE_KEYS.DATA_PREFIX}wrong2`,
        JSON.stringify({ semesters: [], lastModified: 'x' }),
      );
      expect(loadFromLocalStorage('wrong2')).toBeNull();
    });

    it('returns null when stored data has wrong shape (missing lastModified)', () => {
      localStorage.setItem(
        `${STORAGE_KEYS.DATA_PREFIX}wrong3`,
        JSON.stringify({ semesters: [], settings: {} }),
      );
      expect(loadFromLocalStorage('wrong3')).toBeNull();
    });

    it('returns null when stored data is an array', () => {
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}arr`, JSON.stringify([]));
      expect(loadFromLocalStorage('arr')).toBeNull();
    });

    it('returns null when stored data is a string', () => {
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}str`, '"just a string"');
      expect(loadFromLocalStorage('str')).toBeNull();
    });

    it('returns null when stored data is null JSON', () => {
      localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}nul`, 'null');
      expect(loadFromLocalStorage('nul')).toBeNull();
    });

    it('preserves semester data in round-trip', () => {
      const data = makeProfileData({
        semesters: [
          {
            id: 's1',
            name: 'Winter 2025',
            courses: [],
            calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
          },
        ],
      });
      saveToLocalStorage('p1', data);
      const loaded = loadFromLocalStorage('p1');
      expect(loaded?.semesters).toHaveLength(1);
      expect(loaded?.semesters[0]?.name).toBe('Winter 2025');
    });
  });

  // =========================================================================
  // QuotaExceededError handling
  // =========================================================================
  describe('QuotaExceededError handling', () => {
    it('returns error result on QuotaExceededError', () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });

      const result = saveToLocalStorage('x', makeProfileData());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');

      vi.restoreAllMocks();
    });

    it('returns generic error for non-quota exceptions', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Disk failure');
      });

      const result = saveToLocalStorage('x', makeProfileData());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to write');
      expect(result.error).toContain('Disk failure');

      vi.restoreAllMocks();
    });
  });

  // =========================================================================
  // Profile list save/load
  // =========================================================================
  describe('saveProfileList / loadProfileList', () => {
    it('round-trips a valid profile list', () => {
      const profiles = [makeProfile('a', 'Alice'), makeProfile('b', 'Bob')];
      const result = saveProfileList(profiles);
      expect(result.success).toBe(true);

      const loaded = loadProfileList();
      expect(loaded).toEqual(profiles);
    });

    it('returns null when no profile list is stored', () => {
      expect(loadProfileList()).toBeNull();
    });

    it('returns null for non-array data', () => {
      localStorage.setItem(STORAGE_KEYS.PROFILES, '"string"');
      expect(loadProfileList()).toBeNull();
    });

    it('returns null when profile entries are invalid shape', () => {
      localStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify([{ id: 'a' }]), // missing name
      );
      expect(loadProfileList()).toBeNull();
    });

    it('returns null when any profile entry is invalid', () => {
      localStorage.setItem(
        STORAGE_KEYS.PROFILES,
        JSON.stringify([
          { id: 'a', name: 'Valid' },
          { id: 123, name: 'Invalid id type' },
        ]),
      );
      expect(loadProfileList()).toBeNull();
    });

    it('round-trips an empty profile list', () => {
      saveProfileList([]);
      expect(loadProfileList()).toEqual([]);
    });

    it('returns null for corrupt JSON in profiles', () => {
      localStorage.setItem(STORAGE_KEYS.PROFILES, '{broken');
      expect(loadProfileList()).toBeNull();
    });
  });

  // =========================================================================
  // Settings save/load
  // =========================================================================
  describe('saveSettings / loadSettings', () => {
    it('round-trips valid settings', () => {
      const settings = makeSettings({ baseColorHue: 42, theme: ThemeMode.Dark });
      saveSettings(settings);
      expect(loadSettings()).toEqual(settings);
    });

    it('returns defaults when no settings stored', () => {
      expect(loadSettings()).toEqual({ ...DEFAULT_THEME_SETTINGS });
    });

    it('returns defaults for corrupt settings JSON', () => {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, '{{bad');
      expect(loadSettings()).toEqual({ ...DEFAULT_THEME_SETTINGS });
    });

    it('returns defaults when settings has wrong shape', () => {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ theme: 42 }));
      expect(loadSettings()).toEqual({ ...DEFAULT_THEME_SETTINGS });
    });

    it('returns defaults when settings is an array', () => {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, '[]');
      expect(loadSettings()).toEqual({ ...DEFAULT_THEME_SETTINGS });
    });
  });

  // =========================================================================
  // deleteProfileData
  // =========================================================================
  describe('deleteProfileData', () => {
    it('removes the profile data from localStorage', () => {
      saveToLocalStorage('del1', makeProfileData());
      expect(loadFromLocalStorage('del1')).not.toBeNull();

      deleteProfileData('del1');
      expect(loadFromLocalStorage('del1')).toBeNull();
    });

    it('does not throw for non-existent profile', () => {
      expect(() => deleteProfileData('nope')).not.toThrow();
    });
  });

  // =========================================================================
  // getStorageUsage
  // =========================================================================
  describe('getStorageUsage', () => {
    it('returns zero usage for empty localStorage', () => {
      const usage = getStorageUsage();
      expect(usage.used).toBe(0);
      expect(usage.percentage).toBe(0);
      expect(usage.available).toBeGreaterThan(0);
    });

    it('reports non-zero usage after writing data', () => {
      localStorage.setItem('key', 'value');
      const usage = getStorageUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.percentage).toBeGreaterThan(0);
    });

    it('used + available equals approximate quota', () => {
      localStorage.setItem('test', 'x'.repeat(100));
      const usage = getStorageUsage();
      expect(usage.used + usage.available).toBe(5 * 1024 * 1024);
    });
  });

  // =========================================================================
  // exportAllData
  // =========================================================================
  describe('exportAllData', () => {
    it('exports empty data when nothing is stored', () => {
      const json = exportAllData();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(1);
      expect(parsed.profiles).toEqual([]);
      expect(parsed.settings).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
    });

    it('includes profile data in export', () => {
      const profiles = [makeProfile('p1', 'Profile 1')];
      const data = makeProfileData({ lastModified: '2025-06-01T00:00:00Z' });
      saveProfileList(profiles);
      saveToLocalStorage('p1', data);

      const json = exportAllData();
      const parsed = JSON.parse(json);
      expect(parsed.profiles).toEqual(profiles);
      expect(parsed.profilesData['p1']).toEqual(data);
    });

    it('exports settings', () => {
      const settings = makeSettings({ baseColorHue: 99 });
      saveSettings(settings);

      const json = exportAllData();
      const parsed = JSON.parse(json);
      expect(parsed.settings.baseColorHue).toBe(99);
    });

    it('skips profiles with no stored data', () => {
      saveProfileList([makeProfile('p1', 'A'), makeProfile('p2', 'B')]);
      saveToLocalStorage('p1', makeProfileData());
      // p2 has no data

      const parsed = JSON.parse(exportAllData());
      expect(Object.keys(parsed.profilesData)).toEqual(['p1']);
    });
  });

  // =========================================================================
  // importData
  // =========================================================================
  describe('importData', () => {
    it('successfully imports valid export data', () => {
      const exportJson = JSON.stringify({
        version: 1,
        profiles: [makeProfile('i1', 'Imported')],
        settings: makeSettings(),
        profilesData: {
          i1: makeProfileData(),
        },
      });

      const result = importData(exportJson);
      expect(result.success).toBe(true);

      // Verify data was written
      const loaded = loadProfileList();
      expect(loaded).toHaveLength(1);
      expect(loaded?.[0]?.name).toBe('Imported');

      const profileData = loadFromLocalStorage('i1');
      expect(profileData).not.toBeNull();
    });

    it('returns error for invalid JSON', () => {
      const result = importData('not json!');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('returns error for non-object top level', () => {
      const result = importData('"just a string"');
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON object');
    });

    it('returns error for missing version', () => {
      const result = importData(JSON.stringify({ profiles: [], profilesData: {} }));
      expect(result.success).toBe(false);
      expect(result.error).toContain('version');
    });

    it('returns error for invalid profiles array', () => {
      const result = importData(
        JSON.stringify({ version: 1, profiles: 'not-array', profilesData: {} }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('profiles');
    });

    it('returns error for invalid profile entries', () => {
      const result = importData(
        JSON.stringify({
          version: 1,
          profiles: [{ id: 123 }], // invalid: id not string
          profilesData: {},
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('profiles');
    });

    it('returns error for invalid settings object', () => {
      const result = importData(
        JSON.stringify({
          version: 1,
          profiles: [],
          settings: 'bad',
          profilesData: {},
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('settings');
    });

    it('returns error for missing profilesData', () => {
      const result = importData(
        JSON.stringify({ version: 1, profiles: [] }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('profilesData');
    });

    it('returns error for invalid profile data shape', () => {
      const result = importData(
        JSON.stringify({
          version: 1,
          profiles: [makeProfile('p1', 'Test')],
          profilesData: {
            p1: { semesters: 'not-array', settings: {} },
          },
        }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid data');
    });

    it('succeeds when profilesData has missing entries for some profiles', () => {
      const result = importData(
        JSON.stringify({
          version: 1,
          profiles: [makeProfile('p1', 'A')],
          profilesData: {}, // p1 not in profilesData
        }),
      );
      expect(result.success).toBe(true);
    });

    it('succeeds without settings field', () => {
      const result = importData(
        JSON.stringify({
          version: 1,
          profiles: [],
          profilesData: {},
        }),
      );
      expect(result.success).toBe(true);
    });

    it('returns error for array top level', () => {
      const result = importData('[]');
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON object');
    });

    it('round-trips through export then import', () => {
      // Set up data
      const profiles = [makeProfile('rt1', 'RoundTrip')];
      const data = makeProfileData({
        semesters: [{
          id: 's1', name: 'Fall', courses: [],
          calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
        }],
      });
      saveProfileList(profiles);
      saveToLocalStorage('rt1', data);
      saveSettings(makeSettings({ baseColorHue: 77 }));

      // Export
      const exported = exportAllData();

      // Clear and import
      localStorage.clear();
      const result = importData(exported);
      expect(result.success).toBe(true);

      // Verify
      const loadedProfiles = loadProfileList();
      expect(loadedProfiles).toHaveLength(1);
      expect(loadedProfiles?.[0]?.name).toBe('RoundTrip');

      const loadedData = loadFromLocalStorage('rt1');
      expect(loadedData?.semesters).toHaveLength(1);
    });
  });
});
