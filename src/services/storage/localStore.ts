import {
  profileMetaSchema,
  VALIDATION_LIMITS,
  type AppData,
  type ProfileMeta,
} from '@/domain/model'
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

/**
 * Loads the profile registry element-wise: a single malformed entry must never
 * discard the whole list (that would orphan every profile and drop the user into
 * a blank "fresh install"). Over-long/blank names are salvaged by clamping to the
 * schema limit rather than dropping the profile; only entries with no usable id
 * are skipped.
 */
export function loadProfiles(storage: StorageLike): ProfileMeta[] {
  const raw = storage.getItem(STORAGE_KEYS.PROFILES)
  if (raw === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const metas: ProfileMeta[] = []
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue
    const e = entry as Record<string, unknown>
    if (typeof e.id !== 'string' || e.id.length === 0) continue
    const trimmed = typeof e.name === 'string' ? e.name.trim() : ''
    const name = trimmed.slice(0, VALIDATION_LIMITS.PROFILE_NAME_MAX) || 'Profile'
    const result = profileMetaSchema.safeParse({ id: e.id, name })
    if (result.success) metas.push(result.data)
  }
  return metas
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

/**
 * Whether a stored blob exists for this profile, regardless of whether it decodes.
 * Lets the caller tell "no data yet" apart from "data present but unreadable" so a
 * corrupt blob is never silently overwritten with an empty one.
 */
export function hasStoredProfile(storage: StorageLike, profileId: string): boolean {
  return storage.getItem(profileKey(profileId)) !== null
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
