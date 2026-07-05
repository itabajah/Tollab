import { createStore } from 'zustand/vanilla'
import type { SyncStatus } from '@/services/sync/backend'

/** UI-facing sync state. 'unavailable' means no Firebase config was built in. */
export type SyncUiStatus = SyncStatus | 'unavailable'

export interface SyncState {
  status: SyncUiStatus
  userEmail: string | null
  setStatus: (status: SyncUiStatus) => void
  setUserEmail: (email: string | null) => void
}

export type SyncStore = ReturnType<typeof createSyncStore>

export function createSyncStore(initialStatus: SyncUiStatus) {
  return createStore<SyncState>()((set) => ({
    status: initialStatus,
    userEmail: null,
    setStatus: (status) => set({ status }),
    setUserEmail: (userEmail) => set({ userEmail }),
  }))
}
