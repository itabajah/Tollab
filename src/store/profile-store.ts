/**
 * Profile management Zustand store.
 *
 * Manages the list of user profiles and tracks the active profile.
 * Profile *data* (semesters, settings) lives in app-store; this store
 * only handles profile metadata.
 *
 * Side effects (localStorage, Firebase) are NOT handled here.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { Profile, ProfileData } from '@/types';

import { useAppStore } from './app-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID();
}

/** Get a unique profile name by appending a counter if needed. */
function uniqueName(baseName: string, profiles: Profile[]): string {
  const trimmed = baseName.trim();
  if (!profiles.some((p) => p.name === trimmed)) return trimmed;

  let counter = 2;
  while (profiles.some((p) => p.name === `${trimmed} (${counter})`)) {
    counter++;
  }
  return `${trimmed} (${counter})`;
}

// ---------------------------------------------------------------------------
// State & action types
// ---------------------------------------------------------------------------

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string;
}

interface ProfileActions {
  createProfile: (name: string) => string;
  switchProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  exportProfile: (id: string) => string | null;
  importProfile: (jsonString: string) => string | null;
  getActiveProfile: () => Profile | null;
}

export type ProfileStore = ProfileState & ProfileActions;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProfileStore = create<ProfileStore>()(
  immer((set, get) => ({
    profiles: [{ id: 'default', name: 'Default Profile' }],
    activeProfileId: 'default',

    // ======================================================================
    // CRUD
    // ======================================================================

    createProfile: (name) => {
      const id = generateId();
      set((state) => {
        state.profiles.push({ id, name: name.trim() });
      });
      return id;
    },

    switchProfile: (id) => {
      set((state) => {
        if (state.profiles.some((p) => p.id === id)) {
          state.activeProfileId = id;
        }
      });
    },

    renameProfile: (id, name) => {
      set((state) => {
        const profile = state.profiles.find((p) => p.id === id);
        if (profile) {
          profile.name = name.trim();
        }
      });
    },

    deleteProfile: (id) => {
      set((state) => {
        if (state.profiles.length <= 1) {
          // Last profile: replace with a fresh default
          const newId = generateId();
          state.profiles = [{ id: newId, name: 'Default Profile' }];
          state.activeProfileId = newId;
          return;
        }

        state.profiles = state.profiles.filter((p) => p.id !== id);

        if (state.activeProfileId === id) {
          state.activeProfileId = state.profiles[0]?.id ?? 'default';
        }
      });
    },

    // ======================================================================
    // Export / Import
    // ======================================================================

    exportProfile: (id) => {
      const { profiles, activeProfileId } = get();
      const profile = profiles.find((p) => p.id === id);
      if (!profile) return null;

      // Read current app data only if exporting the active profile
      let data: ProfileData;
      if (id === activeProfileId) {
        const appState = useAppStore.getState();
        data = {
          semesters: appState.semesters,
          settings: appState.settings,
          lastModified: appState.lastModified,
        };
      } else {
        // Non-active profile data isn't loaded — caller must load it first
        return null;
      }

      const exportObj = {
        meta: {
          version: 1,
          profileName: profile.name,
          exportDate: new Date().toISOString(),
        },
        data,
      };

      return JSON.stringify(exportObj, null, 2);
    },

    importProfile: (jsonString) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        return null;
      }

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return null;
      }

      const obj = parsed as Record<string, unknown>;

      // Support both { meta, data } and raw ProfileData formats
      let profileName = 'Imported Profile';
      let profileData: unknown = obj;

      if (obj['meta'] && obj['data']) {
        const meta = obj['meta'] as Record<string, unknown>;
        profileData = obj['data'];
        if (typeof meta['profileName'] === 'string') {
          profileName = meta['profileName'];
        }
      }

      // Basic validation: must have semesters array and settings object
      const data = profileData as Record<string, unknown>;
      if (!Array.isArray(data['semesters'])) return null;
      if (typeof data['settings'] !== 'object' || data['settings'] === null)
        return null;

      const id = generateId();
      const name = uniqueName(profileName, get().profiles);

      set((state) => {
        state.profiles.push({ id, name });
      });

      return id;
    },

    // ======================================================================
    // Getters
    // ======================================================================

    getActiveProfile: () => {
      const { profiles, activeProfileId } = get();
      return profiles.find((p) => p.id === activeProfileId) ?? null;
    },
  })),
);
