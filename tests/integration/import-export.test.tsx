/**
 * Integration tests: Storage save/load round-trip and import/export.
 *
 * Exercises the storage service functions (saveToLocalStorage, loadFromLocalStorage,
 * exportAllData, importData) and validates data integrity through round-trips.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_THEME_SETTINGS } from '@/constants';
import {
  deleteProfileData,
  exportAllData,
  getStorageUsage,
  importData,
  loadFromLocalStorage,
  loadProfileList,
  loadSettings,
  saveProfileList,
  saveSettings,
  saveToLocalStorage,
} from '@/services/storage';
import type { AppSettings, Profile, ProfileData } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testProfile: Profile = { id: 'test-1', name: 'Test Profile' };

const testProfileData: ProfileData = {
  semesters: [
    {
      id: 'sem-1',
      name: 'Winter 2025',
      courses: [
        {
          id: 'c-1',
          name: 'Intro CS',
          number: '234111',
          points: '3.0',
          lecturer: 'Dr. A',
          faculty: 'CS',
          location: 'Taub 2',
          grade: '90',
          color: 'hsl(137, 45%, 50%)',
          syllabus: '',
          notes: 'Great course',
          exams: { moedA: '2025-02-01', moedB: '2025-03-01' },
          schedule: [{ day: 0, start: '08:30', end: '10:30' }],
          homework: [
            {
              title: 'HW 1',
              dueDate: '2025-01-15',
              completed: true,
              notes: '',
              links: [{ label: 'Submit', url: 'https://example.com' }],
            },
          ],
          recordings: {
            tabs: [
              {
                id: 'lectures',
                name: 'Lectures',
                items: [
                  {
                    name: 'Lecture 1',
                    videoLink: 'https://example.com/v1',
                    slideLink: '',
                    watched: true,
                  },
                ],
              },
            ],
          },
        },
      ],
      calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4] },
    },
  ],
  settings: { ...DEFAULT_THEME_SETTINGS },
  lastModified: '2025-04-01T12:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Storage save/load round-trip', () => {
  it('saves and loads profile data with full fidelity', () => {
    const result = saveToLocalStorage('test-1', testProfileData);
    expect(result.success).toBe(true);

    const loaded = loadFromLocalStorage('test-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.semesters).toHaveLength(1);
    expect(loaded!.semesters[0]!.name).toBe('Winter 2025');
    expect(loaded!.semesters[0]!.courses[0]!.name).toBe('Intro CS');
    expect(loaded!.semesters[0]!.courses[0]!.homework[0]!.title).toBe('HW 1');
    expect(loaded!.semesters[0]!.courses[0]!.recordings.tabs[0]!.items[0]!.watched).toBe(true);
    expect(loaded!.lastModified).toBe('2025-04-01T12:00:00.000Z');
  });

  it('returns null for missing profile data', () => {
    expect(loadFromLocalStorage('nonexistent')).toBeNull();
  });

  it('saves and loads profile list', () => {
    const profiles: Profile[] = [
      { id: 'p1', name: 'Profile 1' },
      { id: 'p2', name: 'Profile 2' },
    ];

    const result = saveProfileList(profiles);
    expect(result.success).toBe(true);

    const loaded = loadProfileList();
    expect(loaded).toHaveLength(2);
    expect(loaded![0]!.id).toBe('p1');
    expect(loaded![1]!.name).toBe('Profile 2');
  });

  it('returns null for missing profile list', () => {
    expect(loadProfileList()).toBeNull();
  });

  it('saves and loads settings', () => {
    const settings: AppSettings = {
      ...DEFAULT_THEME_SETTINGS,
      showCompleted: false,
      baseColorHue: 150,
    };

    const result = saveSettings(settings);
    expect(result.success).toBe(true);

    const loaded = loadSettings();
    expect(loaded.showCompleted).toBe(false);
    expect(loaded.baseColorHue).toBe(150);
  });

  it('returns defaults for missing settings', () => {
    const loaded = loadSettings();
    expect(loaded).toEqual({ ...DEFAULT_THEME_SETTINGS });
  });

  it('deletes profile data', () => {
    saveToLocalStorage('test-1', testProfileData);
    expect(loadFromLocalStorage('test-1')).not.toBeNull();

    deleteProfileData('test-1');
    expect(loadFromLocalStorage('test-1')).toBeNull();
  });

  it('reports storage usage', () => {
    saveProfileList([testProfile]);
    saveToLocalStorage('test-1', testProfileData);

    const usage = getStorageUsage();
    expect(usage.used).toBeGreaterThan(0);
    expect(usage.percentage).toBeGreaterThan(0);
    expect(usage.percentage).toBeLessThan(100);
    expect(usage.available).toBeGreaterThan(0);
  });
});

describe('Export produces valid JSON', () => {
  it('exports all data as valid JSON containing profiles, settings, profilesData', () => {
    saveProfileList([testProfile]);
    saveToLocalStorage('test-1', testProfileData);
    saveSettings({ ...DEFAULT_THEME_SETTINGS });

    const exported = exportAllData();
    const parsed = JSON.parse(exported);

    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0].id).toBe('test-1');
    expect(parsed.settings).toBeDefined();
    expect(parsed.profilesData['test-1']).toBeDefined();
    expect(parsed.profilesData['test-1'].semesters).toHaveLength(1);
  });

  it('exports empty state gracefully', () => {
    const exported = exportAllData();
    const parsed = JSON.parse(exported);

    expect(parsed.version).toBe(1);
    expect(parsed.profiles).toEqual([]);
    expect(parsed.profilesData).toEqual({});
  });
});

describe('Import validates and creates profiles', () => {
  it('full round-trip: export → import → verify data', () => {
    saveProfileList([testProfile]);
    saveToLocalStorage('test-1', testProfileData);
    saveSettings({ ...DEFAULT_THEME_SETTINGS });

    const exported = exportAllData();

    // Clear and re-import
    localStorage.clear();
    const result = importData(exported);
    expect(result.success).toBe(true);

    // Verify profiles list
    const profiles = loadProfileList();
    expect(profiles).toHaveLength(1);
    expect(profiles![0]!.id).toBe('test-1');

    // Verify profile data
    const data = loadFromLocalStorage('test-1');
    expect(data).not.toBeNull();
    expect(data!.semesters[0]!.courses[0]!.name).toBe('Intro CS');
  });

  it('rejects invalid JSON', () => {
    const result = importData('not json at all');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('rejects non-object top level', () => {
    const result = importData('"a string"');
    expect(result.success).toBe(false);
  });

  it('rejects missing version', () => {
    const result = importData(JSON.stringify({ profiles: [], profilesData: {} }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('version');
  });

  it('rejects invalid profiles array', () => {
    const result = importData(
      JSON.stringify({ version: 1, profiles: 'not-array', profilesData: {} }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('profiles');
  });

  it('rejects invalid profilesData', () => {
    const result = importData(
      JSON.stringify({
        version: 1,
        profiles: [{ id: 'p1', name: 'P1' }],
        profilesData: 'bad',
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('profilesData');
  });

  it('rejects profile with invalid data shape', () => {
    const result = importData(
      JSON.stringify({
        version: 1,
        profiles: [{ id: 'p1', name: 'P1' }],
        profilesData: { p1: { semesters: 'bad' } },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid data');
  });

  it('accepts import with missing settings (optional)', () => {
    const payload = {
      version: 1,
      profiles: [{ id: 'p1', name: 'Test' }],
      profilesData: {
        p1: {
          semesters: [],
          settings: { ...DEFAULT_THEME_SETTINGS },
          lastModified: new Date().toISOString(),
        },
      },
    };

    const result = importData(JSON.stringify(payload));
    expect(result.success).toBe(true);
  });

  it('rejects invalid settings object in import', () => {
    const result = importData(
      JSON.stringify({
        version: 1,
        profiles: [],
        profilesData: {},
        settings: { theme: 123, invalid: true },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('settings');
  });
});
