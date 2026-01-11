import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import { Profile, STORAGE_KEYS } from '@/types';

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;

  // Getters
  getActiveProfile: () => Profile | null;
  isOnboardingComplete: () => boolean;

  // Actions
  addProfile: (name: string) => string;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  completeOnboarding: (data: { faculty: string; degree: string; cpGoal: number; startYear: number }) => void;

  // Initialize default profile if none exists
  initializeProfiles: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        if (!activeProfileId) return profiles[0] || null;
        return profiles.find((p) => p.id === activeProfileId) || null;
      },

      isOnboardingComplete: () => {
        const profile = get().getActiveProfile();
        return profile?.onboardingComplete ?? false;
      },

      addProfile: (name: string) => {
        const id = uuid();
        set((state) => ({
          profiles: [...state.profiles, { id, name }],
          activeProfileId: state.activeProfileId || id,
        }));
        return id;
      },

      updateProfile: (id: string, updates: Partial<Profile>) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProfile: (id: string) => {
        set((state) => {
          const newProfiles = state.profiles.filter((p) => p.id !== id);
          return {
            profiles: newProfiles,
            activeProfileId:
              state.activeProfileId === id
                ? newProfiles[0]?.id || null
                : state.activeProfileId,
          };
        });
      },

      setActiveProfile: (id: string) => {
        set({ activeProfileId: id });
      },

      completeOnboarding: (data: { faculty: string; degree: string; cpGoal: number; startYear: number }) => {
        const profile = get().getActiveProfile();
        if (profile) {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === profile.id
                ? { ...p, ...data, onboardingComplete: true }
                : p
            ),
          }));
        }
      },

      initializeProfiles: () => {
        const { profiles } = get();
        if (profiles.length === 0) {
          const id = uuid();
          set({
            profiles: [{ id, name: 'Main Profile' }],
            activeProfileId: id,
          });
        }
      },
    }),
    {
      name: STORAGE_KEYS.PROFILES,
    }
  )
);
