/**
 * Typed localStorage persistence service for Tollab.
 *
 * Clean JSON serialization — no compact format, no legacy migration.
 * Every function is pure beyond its localStorage side-effect.
 */

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { AppSettings, Profile, ProfileData } from '@/types';
import { ColorTheme, ThemeMode } from '@/types';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result of a storage write operation. */
export interface StorageWriteResult {
  success: boolean;
  error?: string;
}

/** localStorage usage estimate. */
export interface StorageUsage {
  /** Bytes currently used. */
  used: number;
  /** Approximate bytes available (based on 5 MB default). */
  available: number;
  /** Percentage of quota used (0–100). */
  percentage: number;
}

/** Result of an import operation. */
export interface ImportResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Default application settings (applied when none are stored). */
const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  theme: ThemeMode.Light,
  showCompleted: true,
  showWatchedRecordings: false,
  colorTheme: ColorTheme.Colorful,
  baseColorHue: 200,
});

/** Approximate localStorage quota in bytes (5 MB is the common browser default). */
const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;

/** Build the per-profile storage key. */
function profileKey(profileId: string): string {
  return `${STORAGE_KEYS.DATA_PREFIX}${profileId}`;
}

/**
 * Safely write a value to localStorage, catching quota errors.
 */
function safeSetItem(key: string, value: string): StorageWriteResult {
  try {
    localStorage.setItem(key, value);
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof DOMException && error.name === 'QuotaExceededError'
        ? 'Storage quota exceeded. Export your data and remove old profiles.'
        : `Failed to write to localStorage: ${String(error)}`;
    return { success: false, error: message };
  }
}

/**
 * Safely read a value from localStorage and parse it as JSON.
 * Returns `null` for missing keys, parse failures, or any thrown error.
 */
function safeGetItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Basic shape check for ProfileData. */
function isValidProfileData(data: unknown): data is ProfileData {
  if (!isObject(data)) return false;
  if (!Array.isArray(data['semesters'])) return false;
  if (!isObject(data['settings'])) return false;
  if (typeof data['lastModified'] !== 'string') return false;
  return true;
}

/** Basic shape check for a Profile entry. */
function isValidProfile(entry: unknown): entry is Profile {
  if (!isObject(entry)) return false;
  if (typeof entry['id'] !== 'string') return false;
  if (typeof entry['name'] !== 'string') return false;
  return true;
}

/** Basic shape check for AppSettings. */
function isValidSettings(data: unknown): data is AppSettings {
  if (!isObject(data)) return false;
  if (typeof data['theme'] !== 'string') return false;
  if (typeof data['showCompleted'] !== 'boolean') return false;
  if (typeof data['showWatchedRecordings'] !== 'boolean') return false;
  if (typeof data['colorTheme'] !== 'string') return false;
  if (typeof data['baseColorHue'] !== 'number') return false;
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Save a profile's data to localStorage as clean JSON.
 */
export function saveToLocalStorage(
  profileId: string,
  data: ProfileData,
): StorageWriteResult {
  return safeSetItem(profileKey(profileId), JSON.stringify(data));
}

/**
 * Load a profile's data from localStorage.
 * Returns `null` if missing, corrupt, or not valid ProfileData.
 */
export function loadFromLocalStorage(profileId: string): ProfileData | null {
  const data = safeGetItem<unknown>(profileKey(profileId));
  if (data === null) return null;
  return isValidProfileData(data) ? data : null;
}

/**
 * Save the profile list to localStorage.
 */
export function saveProfileList(profiles: Profile[]): StorageWriteResult {
  return safeSetItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
}

/**
 * Load the profile list from localStorage.
 * Returns `null` if missing or invalid.
 */
export function loadProfileList(): Profile[] | null {
  const data = safeGetItem<unknown[]>(STORAGE_KEYS.PROFILES);
  if (!Array.isArray(data)) return null;
  if (!data.every(isValidProfile)) return null;
  return data;
}

/**
 * Save application-wide settings to localStorage.
 */
export function saveSettings(settings: AppSettings): StorageWriteResult {
  return safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/**
 * Load application-wide settings from localStorage.
 * Falls back to defaults if missing or invalid.
 */
export function loadSettings(): AppSettings {
  const data = safeGetItem<unknown>(STORAGE_KEYS.SETTINGS);
  if (data !== null && isValidSettings(data)) return data;
  return { ...DEFAULT_SETTINGS };
}

/**
 * Delete a profile's data from localStorage.
 */
export function deleteProfileData(profileId: string): void {
  try {
    localStorage.removeItem(profileKey(profileId));
  } catch {
    // Removal failure is non-critical — ignore.
  }
}

/**
 * Estimate current localStorage usage.
 *
 * Iterates all keys and sums the UTF-16 character lengths (each char = 2 bytes
 * in the localStorage DOMString model).
 */
export function getStorageUsage(): StorageUsage {
  let totalChars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null) {
        const value = localStorage.getItem(key);
        totalChars += key.length + (value?.length ?? 0);
      }
    }
  } catch {
    // If access fails, report zero usage.
  }

  const used = totalChars * 2; // UTF-16: 2 bytes per char
  const available = Math.max(0, STORAGE_QUOTA_BYTES - used);
  const percentage = Math.min(100, (used / STORAGE_QUOTA_BYTES) * 100);

  return { used, available, percentage };
}

/**
 * Export all Tollab data (profiles list + every profile's data + settings)
 * as a single JSON string suitable for file download / backup.
 */
export function exportAllData(): string {
  const profiles = loadProfileList() ?? [];
  const settings = loadSettings();

  const profilesData: Record<string, ProfileData> = {};
  for (const profile of profiles) {
    const data = loadFromLocalStorage(profile.id);
    if (data !== null) {
      profilesData[profile.id] = data;
    }
  }

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles,
    settings,
    profilesData,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Validate and import data from a JSON string (as produced by `exportAllData`).
 */
export function importData(jsonString: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON format.' };
  }

  if (!isObject(parsed)) {
    return { success: false, error: 'Expected a JSON object at the top level.' };
  }

  // Validate top-level shape
  if (typeof parsed['version'] !== 'number') {
    return { success: false, error: 'Missing or invalid version field.' };
  }

  const profiles = parsed['profiles'];
  if (!Array.isArray(profiles) || !profiles.every(isValidProfile)) {
    return { success: false, error: 'Invalid or missing profiles array.' };
  }

  const settings = parsed['settings'];
  if (settings !== undefined && !isValidSettings(settings)) {
    return { success: false, error: 'Invalid settings object.' };
  }

  const profilesData = parsed['profilesData'];
  if (!isObject(profilesData)) {
    return { success: false, error: 'Invalid or missing profilesData object.' };
  }

  // Validate each profile's data
  for (const profile of profiles) {
    const data: unknown = profilesData[profile.id];
    if (data !== undefined && !isValidProfileData(data)) {
      return {
        success: false,
        error: `Profile "${profile.name}" has invalid data.`,
      };
    }
  }

  // All validations passed — write to localStorage
  const profileWriteResult = saveProfileList(profiles as Profile[]);
  if (!profileWriteResult.success) {
    return { success: false, error: profileWriteResult.error };
  }

  if (settings !== undefined) {
    const settingsResult = saveSettings(settings as AppSettings);
    if (!settingsResult.success) {
      return { success: false, error: settingsResult.error };
    }
  }

  for (const profile of profiles as Profile[]) {
    const data: unknown = profilesData[profile.id];
    if (data !== undefined) {
      const result = saveToLocalStorage(profile.id, data as ProfileData);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }
  }

  return { success: true };
}
