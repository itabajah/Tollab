import {
  createEmptyAppData,
  VALIDATION_LIMITS,
  type AppData,
  type ProfileMeta,
} from '@/domain/model'
import { newId } from '@/domain/ids'
import {
  loadActiveProfileId,
  loadProfileData,
  loadProfiles,
  saveActiveProfileId,
  saveProfileData,
  saveProfiles,
  deleteProfileData,
  type StorageLike,
} from '@/services/storage/localStore'
import { migrateLegacyStorage } from '@/services/storage/migrate'
import {
  buildExportFile,
  type ExportFileV3,
  type ParsedImport,
} from '@/services/storage/exportImport'
import { createAppStore, type AppStore } from './appStore'
import { createProfilesStore, type ProfilesStore } from './profilesStore'

/**
 * The session controller owns the lifetime of the stores and all profile
 * orchestration. Ordering rule that keeps data safe: pending writes are always
 * flushed for the OLD active profile before the active profile changes.
 */
export interface SessionOptions {
  storage: StorageLike
  now?: () => Date
  saveDebounceMs?: number
  /** Fired synchronously on every local data change (the sync engine listens). */
  onDirty?: () => void
  onSaveError?: (error: unknown) => void
}

export type Result = { ok: true } | { ok: false; error: string }

export interface Session {
  appStore: AppStore
  profilesStore: ProfilesStore
  createProfile: (name: string) => Result
  renameProfile: (id: string, name: string) => Result
  deleteProfile: (id: string) => void
  switchProfile: (id: string) => void
  importProfile: (parsed: ParsedImport) => { profileId: string; name: string }
  buildExport: () => ExportFileV3
  /** Replaces the active profile's data without marking it dirty for sync. */
  applyExternalData: (data: AppData) => void
  /** Silently re-reads profiles, active id and active data from storage (post-sync). */
  refreshFromStorage: () => void
  flush: () => void
  dispose: () => void
}

export function createSession(options: SessionOptions): Session {
  const { storage, onDirty, onSaveError } = options
  const now = options.now ?? (() => new Date())
  const saveDebounceMs = options.saveDebounceMs ?? 250

  migrateLegacyStorage(storage)

  const persist = <T>(write: () => T): T | undefined => {
    try {
      return write()
    } catch (error) {
      onSaveError?.(error)
      return undefined
    }
  }

  // --- bootstrap ------------------------------------------------------------
  let profiles = loadProfiles(storage)
  if (profiles.length === 0) {
    const meta: ProfileMeta = { id: newId(), name: 'Default Profile' }
    profiles = [meta]
    const empty = createEmptyAppData(now().toISOString())
    persist(() => {
      saveProfiles(storage, profiles)
      saveProfileData(storage, meta.id, empty, empty.lastModified)
      saveActiveProfileId(storage, meta.id)
    })
  }

  let activeId = loadActiveProfileId(storage)
  if (activeId === null || !profiles.some((p) => p.id === activeId)) {
    activeId = profiles[0]!.id
    persist(() => saveActiveProfileId(storage, activeId!))
  }

  let initialData = loadProfileData(storage, activeId)
  if (initialData === null) {
    initialData = createEmptyAppData(now().toISOString())
    const data = initialData
    persist(() => saveProfileData(storage, activeId!, data, data.lastModified))
  }

  const appStore = createAppStore(initialData, { now })
  const profilesStore = createProfilesStore({ profiles, activeProfileId: activeId })

  // --- persistence ----------------------------------------------------------
  let pendingTimer: ReturnType<typeof setTimeout> | null = null
  let dirty = false
  let applyingExternal = false

  const writePending = () => {
    if (pendingTimer !== null) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
    if (!dirty) return
    dirty = false
    const { data } = appStore.getState()
    const id = profilesStore.getState().activeProfileId
    persist(() => saveProfileData(storage, id, data, data.lastModified))
  }

  const unsubscribe = appStore.subscribe((state, prev) => {
    if (state.data === prev.data || applyingExternal) return
    dirty = true
    onDirty?.()
    if (pendingTimer !== null) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(writePending, saveDebounceMs)
  })

  const setDataSilently = (data: AppData) => {
    applyingExternal = true
    try {
      appStore.getState().setData(data)
    } finally {
      applyingExternal = false
    }
  }

  const activateProfile = (id: string, data: AppData) => {
    profilesStore.getState().setActiveProfileId(id)
    persist(() => saveActiveProfileId(storage, id))
    setDataSilently(data)
  }

  // --- profile operations ---------------------------------------------------
  const validateProfileName = (name: string, excludeId?: string): string | null => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return 'Profile name is required'
    if (trimmed.length > VALIDATION_LIMITS.PROFILE_NAME_MAX) return 'Profile name is too long'
    const taken = profilesStore
      .getState()
      .profiles.some((p) => p.id !== excludeId && p.name.toLowerCase() === trimmed.toLowerCase())
    if (taken) return 'A profile with this name already exists'
    return null
  }

  const uniqueProfileName = (base: string): string => {
    const names = new Set(profilesStore.getState().profiles.map((p) => p.name.toLowerCase()))
    if (!names.has(base.toLowerCase())) return base
    for (let n = 2; ; n++) {
      const candidate = `${base} (${n})`
      if (!names.has(candidate.toLowerCase())) return candidate
    }
  }

  const addProfile = (name: string, data: AppData): ProfileMeta => {
    writePending()
    const meta: ProfileMeta = { id: newId(), name }
    const nextProfiles = [...profilesStore.getState().profiles, meta]
    profilesStore.getState().setProfiles(nextProfiles)
    persist(() => {
      saveProfiles(storage, nextProfiles)
      saveProfileData(storage, meta.id, data, data.lastModified)
    })
    activateProfile(meta.id, data)
    return meta
  }

  const session: Session = {
    appStore,
    profilesStore,

    createProfile(name) {
      const error = validateProfileName(name)
      if (error !== null) return { ok: false, error }
      addProfile(name.trim(), createEmptyAppData(now().toISOString()))
      return { ok: true }
    },

    renameProfile(id, name) {
      const error = validateProfileName(name, id)
      if (error !== null) return { ok: false, error }
      const nextProfiles = profilesStore
        .getState()
        .profiles.map((p) => (p.id === id ? { ...p, name: name.trim() } : p))
      profilesStore.getState().setProfiles(nextProfiles)
      persist(() => saveProfiles(storage, nextProfiles))

      // Bump the profile's data timestamp so the rename wins cloud merges.
      if (id === profilesStore.getState().activeProfileId) {
        appStore.getState().touch()
        writePending()
      } else {
        const data = loadProfileData(storage, id)
        if (data !== null) {
          data.lastModified = now().toISOString()
          persist(() => saveProfileData(storage, id, data, data.lastModified))
        }
      }
      return { ok: true }
    },

    deleteProfile(id) {
      writePending()
      const remaining = profilesStore.getState().profiles.filter((p) => p.id !== id)
      persist(() => deleteProfileData(storage, id))

      if (remaining.length === 0) {
        const meta: ProfileMeta = { id: newId(), name: 'Default Profile' }
        const empty = createEmptyAppData(now().toISOString())
        profilesStore.getState().setProfiles([meta])
        persist(() => {
          saveProfiles(storage, [meta])
          saveProfileData(storage, meta.id, empty, empty.lastModified)
        })
        activateProfile(meta.id, empty)
        return
      }

      profilesStore.getState().setProfiles(remaining)
      persist(() => saveProfiles(storage, remaining))
      if (profilesStore.getState().activeProfileId === id) {
        const next = remaining[0]!
        const data = loadProfileData(storage, next.id) ?? createEmptyAppData(now().toISOString())
        activateProfile(next.id, data)
      }
    },

    switchProfile(id) {
      if (!profilesStore.getState().profiles.some((p) => p.id === id)) return
      if (profilesStore.getState().activeProfileId === id) return
      writePending()
      const data = loadProfileData(storage, id) ?? createEmptyAppData(now().toISOString())
      activateProfile(id, data)
    },

    importProfile(parsed) {
      const name = uniqueProfileName(parsed.profileName?.trim() || 'Imported')
      const meta = addProfile(name, parsed.data)
      return { profileId: meta.id, name: meta.name }
    },

    buildExport() {
      const { profiles: metas, activeProfileId } = profilesStore.getState()
      const meta = metas.find((p) => p.id === activeProfileId)
      return buildExportFile(meta?.name ?? 'Profile', appStore.getState().data, now().toISOString())
    },

    applyExternalData(data) {
      setDataSilently(data)
      const id = profilesStore.getState().activeProfileId
      persist(() => saveProfileData(storage, id, data, data.lastModified))
    },

    refreshFromStorage() {
      const nextProfiles = loadProfiles(storage)
      if (nextProfiles.length > 0) profilesStore.getState().setProfiles(nextProfiles)

      const storedActive = loadActiveProfileId(storage)
      const nextActive =
        storedActive !== null && nextProfiles.some((p) => p.id === storedActive)
          ? storedActive
          : profilesStore.getState().activeProfileId
      profilesStore.getState().setActiveProfileId(nextActive)

      const data = loadProfileData(storage, nextActive)
      if (data !== null) setDataSilently(data)
    },

    flush: writePending,

    dispose() {
      unsubscribe()
      if (pendingTimer !== null) clearTimeout(pendingTimer)
    },
  }

  return session
}
