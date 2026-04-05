/**
 * Store persistence wiring — auto-saves store state to localStorage.
 *
 * Call `initStorePersistence()` once at startup. It:
 *   1. Loads profile list + active profile data from localStorage into stores.
 *   2. Subscribes to app-store changes → debounced save to localStorage.
 *   3. Subscribes to profile-store changes → save profile list to localStorage.
 *
 * Returns an unsubscribe function to tear down all listeners.
 */

import { STORAGE_KEYS } from '@/constants';
import {
  loadFromLocalStorage,
  loadProfileList,
  loadSettings,
  saveProfileList,
  saveSettings,
  saveToLocalStorage,
} from '@/services/storage';
import { useAppStore } from '@/store/app-store';
import { useProfileStore } from '@/store/profile-store';

// ---------------------------------------------------------------------------
// Debounce helper
// ---------------------------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500;

function debouncedSaveAppData(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { semesters, settings, lastModified, currentSemesterId, recordingSortOrders, homeworkSortOrders } =
      useAppStore.getState();
    const { activeProfileId } = useProfileStore.getState();

    // Save profile data
    saveToLocalStorage(activeProfileId, { semesters, settings, lastModified });

    // Save settings separately (for quick theme load before full data)
    saveSettings(settings);

    // Save active profile ID
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, activeProfileId);
    } catch {
      // Quota — ignore
    }

    // Save current semester selection + sort orders in a lightweight key
    try {
      localStorage.setItem(
        `tollab_ui_${activeProfileId}`,
        JSON.stringify({ currentSemesterId, recordingSortOrders, homeworkSortOrders }),
      );
    } catch {
      // Quota — ignore
    }

    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Bootstrap stores from localStorage and wire auto-save subscriptions.
 * Call once at app startup. Returns an unsubscribe teardown function.
 */
export function initStorePersistence(): () => void {
  // --- 1. Load profile list ---
  const savedProfiles = loadProfileList();
  if (savedProfiles && savedProfiles.length > 0) {
    useProfileStore.setState({ profiles: savedProfiles });
  }

  // --- 2. Determine active profile ---
  let activeId: string;
  try {
    activeId =
      localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE) ??
      useProfileStore.getState().profiles[0]?.id ??
      'default';
  } catch {
    activeId = useProfileStore.getState().profiles[0]?.id ?? 'default';
  }

  // Validate the active ID exists
  const profiles = useProfileStore.getState().profiles;
  if (!profiles.some((p) => p.id === activeId)) {
    activeId = profiles[0]?.id ?? 'default';
  }
  useProfileStore.setState({ activeProfileId: activeId });

  // --- 3. Load active profile data into app-store ---
  loadProfileIntoAppStore(activeId);

  // --- 4. Subscribe to app-store changes → debounced save ---
  const unsubApp = useAppStore.subscribe(debouncedSaveAppData);

  // --- 5. Subscribe to profile-store changes → save profile list ---
  const unsubProfile = useProfileStore.subscribe((state, prevState) => {
    // Save profile list when profiles array changes
    if (state.profiles !== prevState.profiles) {
      saveProfileList(state.profiles);
    }
    // When active profile switches, load the new profile's data
    if (state.activeProfileId !== prevState.activeProfileId) {
      loadProfileIntoAppStore(state.activeProfileId);
    }
  });

  return () => {
    unsubApp();
    unsubProfile();
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load a profile's data from localStorage into the app-store. */
function loadProfileIntoAppStore(profileId: string): void {
  const data = loadFromLocalStorage(profileId);
  const settings = loadSettings();

  if (data) {
    // Load UI state (sort orders, current semester) if available
    let uiState: {
      currentSemesterId?: string | null;
      recordingSortOrders?: Record<string, Record<string, string>>;
      homeworkSortOrders?: Record<string, string>;
    } = {};
    try {
      const raw = localStorage.getItem(`tollab_ui_${profileId}`);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const obj = parsed as Record<string, unknown>;
          // Only accept expected shapes — reject unexpected data
          if (
            (obj['currentSemesterId'] === undefined ||
              obj['currentSemesterId'] === null ||
              typeof obj['currentSemesterId'] === 'string') &&
            (obj['recordingSortOrders'] === undefined ||
              (typeof obj['recordingSortOrders'] === 'object' &&
                obj['recordingSortOrders'] !== null)) &&
            (obj['homeworkSortOrders'] === undefined ||
              (typeof obj['homeworkSortOrders'] === 'object' &&
                obj['homeworkSortOrders'] !== null))
          ) {
            uiState = obj as typeof uiState;
          }
        }
      }
    } catch {
      // Corrupt — ignore
    }

    useAppStore.getState().loadData({
      semesters: data.semesters,
      settings: data.settings ?? settings,
      lastModified: data.lastModified,
      currentSemesterId: uiState.currentSemesterId,
      recordingSortOrders: uiState.recordingSortOrders as Record<string, Record<string, import('@/types').RecordingSortOrder>> | undefined,
      homeworkSortOrders: uiState.homeworkSortOrders as Record<string, import('@/types').HomeworkSortOrder> | undefined,
    });
  } else {
    // New profile — start with defaults + saved settings
    useAppStore.getState().loadData({
      semesters: [],
      settings,
    });
  }
}
