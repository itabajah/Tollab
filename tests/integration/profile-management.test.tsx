/**
 * Integration tests: Profile management → store state verification.
 *
 * Exercises createProfile, switchProfile, renameProfile, deleteProfile,
 * exportProfile, importProfile and verifies inter-store coordination.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProfileState() {
  return useProfileStore.getState();
}

function getAppState() {
  return useAppStore.getState();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  useProfileStore.setState({
    profiles: [{ id: 'default', name: 'Default Profile' }],
    activeProfileId: 'default',
  });

  useAppStore.setState({
    semesters: [],
    currentSemesterId: null,
    settings: getAppState().settings,
    lastModified: new Date().toISOString(),
    recordingSortOrders: {},
    homeworkSortOrders: {},
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Profile CRUD integration', () => {
  it('creates a profile and adds it to the list', () => {
    const id = getProfileState().createProfile('Study Profile');

    expect(getProfileState().profiles).toHaveLength(2);
    const created = getProfileState().profiles.find((p) => p.id === id);
    expect(created).toBeDefined();
    expect(created!.name).toBe('Study Profile');
  });

  it('switches active profile', () => {
    const id = getProfileState().createProfile('Second');

    getProfileState().switchProfile(id);
    expect(getProfileState().activeProfileId).toBe(id);

    getProfileState().switchProfile('default');
    expect(getProfileState().activeProfileId).toBe('default');
  });

  it('ignores switch to non-existent profile', () => {
    getProfileState().switchProfile('non-existent');
    expect(getProfileState().activeProfileId).toBe('default');
  });

  it('renames a profile', () => {
    getProfileState().renameProfile('default', 'Renamed Profile');
    expect(getProfileState().profiles[0]!.name).toBe('Renamed Profile');
  });

  it('trims whitespace on rename', () => {
    getProfileState().renameProfile('default', '  Trimmed  ');
    expect(getProfileState().profiles[0]!.name).toBe('Trimmed');
  });

  it('deletes a profile and falls back', () => {
    const second = getProfileState().createProfile('Second');
    getProfileState().switchProfile(second);

    getProfileState().deleteProfile(second);

    expect(getProfileState().profiles).toHaveLength(1);
    expect(getProfileState().profiles[0]!.name).toBe('Default Profile');
    // Falls back to remaining profile
    expect(getProfileState().activeProfileId).toBe('default');
  });

  it('deleting the last profile creates a fresh default', () => {
    getProfileState().deleteProfile('default');

    expect(getProfileState().profiles).toHaveLength(1);
    expect(getProfileState().profiles[0]!.name).toBe('Default Profile');
    // activeProfileId is set to the new profile
    expect(getProfileState().activeProfileId).toBe(getProfileState().profiles[0]!.id);
  });

  it('getActiveProfile returns the active profile', () => {
    const profile = getProfileState().getActiveProfile();
    expect(profile).toBeDefined();
    expect(profile!.id).toBe('default');
    expect(profile!.name).toBe('Default Profile');
  });
});

describe('Profile export/import integration', () => {
  it('exports the active profile as valid JSON', () => {
    // Set up some app data for the active profile
    getAppState().addSemester('Winter 2025');

    const json = getProfileState().exportProfile('default');
    expect(json).not.toBeNull();

    const parsed = JSON.parse(json!);
    expect(parsed.meta).toBeDefined();
    expect(parsed.meta.version).toBe(1);
    expect(parsed.meta.profileName).toBe('Default Profile');
    expect(parsed.data).toBeDefined();
    expect(parsed.data.semesters).toBeInstanceOf(Array);
    expect(parsed.data.settings).toBeDefined();
  });

  it('returns null when exporting non-existent profile', () => {
    const json = getProfileState().exportProfile('non-existent');
    expect(json).toBeNull();
  });

  it('imports a profile from exported JSON', () => {
    getAppState().addSemester('Winter 2025');
    const json = getProfileState().exportProfile('default')!;

    const newId = getProfileState().importProfile(json);
    expect(newId).not.toBeNull();

    const imported = getProfileState().profiles.find((p) => p.id === newId);
    expect(imported).toBeDefined();
    expect(imported!.name).toContain('Default Profile');
  });

  it('import deduplicates profile name', () => {
    getAppState().addSemester('Test');
    const json = getProfileState().exportProfile('default')!;

    const id1 = getProfileState().importProfile(json);
    // First import: "Default Profile (2)" since "Default Profile" exists
    const profile1 = getProfileState().profiles.find((p) => p.id === id1);
    expect(profile1!.name).toBe('Default Profile (2)');

    const id2 = getProfileState().importProfile(json);
    const profile2 = getProfileState().profiles.find((p) => p.id === id2);
    expect(profile2!.name).toBe('Default Profile (3)');
  });

  it('returns null for invalid import JSON', () => {
    expect(getProfileState().importProfile('not json')).toBeNull();
    expect(getProfileState().importProfile('{}')).toBeNull();
    expect(getProfileState().importProfile('[]')).toBeNull();
    expect(getProfileState().importProfile('{"semesters": "bad"}')).toBeNull();
  });

  it('imports raw ProfileData format', () => {
    const rawData = JSON.stringify({
      semesters: [],
      settings: getAppState().settings,
      lastModified: new Date().toISOString(),
    });

    const id = getProfileState().importProfile(rawData);
    expect(id).not.toBeNull();

    const profile = getProfileState().profiles.find((p) => p.id === id);
    expect(profile).toBeDefined();
    expect(profile!.name).toBe('Imported Profile');
  });
});
