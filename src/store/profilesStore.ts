import { createStore } from 'zustand/vanilla'
import type { ProfileMeta } from '@/domain/model'

/**
 * Dumb state holder for the profile registry. All orchestration (creating,
 * switching, persistence ordering) lives in the session controller.
 */
export interface ProfilesState {
  profiles: ProfileMeta[]
  activeProfileId: string
  setProfiles: (profiles: ProfileMeta[]) => void
  setActiveProfileId: (id: string) => void
}

export type ProfilesStore = ReturnType<typeof createProfilesStore>

export function createProfilesStore(initial: { profiles: ProfileMeta[]; activeProfileId: string }) {
  return createStore<ProfilesState>()((set) => ({
    profiles: initial.profiles,
    activeProfileId: initial.activeProfileId,
    setProfiles: (profiles) => set({ profiles }),
    setActiveProfileId: (activeProfileId) => set({ activeProfileId }),
  }))
}
