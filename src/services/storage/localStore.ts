import { z } from 'zod'
import { profileMetaSchema, type AppData, type ProfileMeta } from '@/domain/model'
import { newId } from '@/domain/ids'
import { decodeStoredProfile, encodeStoredProfile } from './codec'
import { STORAGE_KEYS, profileKey } from './keys'

/** Minimal storage interface so everything is testable without a browser. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

const profileListSchema = z.array(profileMetaSchema)

export function loadProfiles(storage: StorageLike): ProfileMeta[] {
  const raw = storage.getItem(STORAGE_KEYS.PROFILES)
  if (raw === null) return []
  try {
    const result = profileListSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : []
  } catch {
    return []
  }
}

export function saveProfiles(storage: StorageLike, profiles: ProfileMeta[]): void {
  storage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles))
}

export function loadActiveProfileId(storage: StorageLike): string | null {
  return storage.getItem(STORAGE_KEYS.ACTIVE)
}

export function saveActiveProfileId(storage: StorageLike, profileId: string): void {
  storage.setItem(STORAGE_KEYS.ACTIVE, profileId)
}

export function loadProfileData(storage: StorageLike, profileId: string): AppData | null {
  return decodeStoredProfile(storage.getItem(profileKey(profileId)))
}

export function saveProfileData(
  storage: StorageLike,
  profileId: string,
  data: AppData,
  savedAt: string,
): void {
  storage.setItem(profileKey(profileId), encodeStoredProfile(data, savedAt))
}

export function deleteProfileData(storage: StorageLike, profileId: string): void {
  storage.removeItem(profileKey(profileId))
}

/** Stable per-browser client id used by the sync engine for echo suppression. */
export function ensureClientId(storage: StorageLike): string {
  const existing = storage.getItem(STORAGE_KEYS.CLIENT)
  if (existing) return existing
  const id = newId()
  storage.setItem(STORAGE_KEYS.CLIENT, id)
  return id
}
