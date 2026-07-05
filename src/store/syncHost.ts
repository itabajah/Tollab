import {
  loadActiveProfileId,
  loadProfileData,
  loadProfiles,
  saveActiveProfileId,
  saveProfileData,
  saveProfiles,
  type StorageLike,
} from '@/services/storage/localStore'
import type { CloudPayload } from '@/domain/merge'
import type { SyncHost } from '@/services/sync/backend'
import type { Session } from './session'

/**
 * Bridges the sync engine to local storage + the live session. getLocalPayload
 * reads every profile (the cloud model is one node holding all profiles);
 * applyRemotePayload writes the merged set back and refreshes the in-memory
 * stores so the UI reflects remote changes immediately.
 */
export function createStorageSyncHost(storage: StorageLike, session: Session): SyncHost {
  return {
    getLocalPayload(): CloudPayload {
      const metas = loadProfiles(storage)
      return {
        activeProfileId: loadActiveProfileId(storage),
        profiles: metas.map((meta) => {
          const data = loadProfileData(storage, meta.id)
          return { id: meta.id, name: meta.name, lastModified: data?.lastModified ?? null, data }
        }),
      }
    },

    applyRemotePayload(payload: CloudPayload): void {
      const metas = payload.profiles.map((p) => ({ id: p.id, name: p.name }))
      saveProfiles(storage, metas)
      for (const profile of payload.profiles) {
        if (profile.data)
          saveProfileData(storage, profile.id, profile.data, profile.data.lastModified)
      }
      const active =
        payload.activeProfileId && metas.some((m) => m.id === payload.activeProfileId)
          ? payload.activeProfileId
          : (metas[0]?.id ?? null)
      if (active) saveActiveProfileId(storage, active)
      session.refreshFromStorage()
    },
  }
}
