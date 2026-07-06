import {
  createMemoryStorage,
  loadProfiles,
  saveProfiles,
  loadActiveProfileId,
  saveActiveProfileId,
  loadProfileData,
  saveProfileData,
  deleteProfileData,
  hasStoredProfile,
  ensureClientId,
} from './localStore'
import { STORAGE_KEYS, profileKey } from './keys'
import { createEmptyAppData } from '@/domain/model'

const NOW = '2026-07-04T10:00:00.000Z'

describe('profiles list', () => {
  it('returns empty list when nothing stored', () => {
    expect(loadProfiles(createMemoryStorage())).toEqual([])
  })

  it('round-trips profile metas', () => {
    const storage = createMemoryStorage()
    saveProfiles(storage, [{ id: 'a', name: 'Alpha' }])
    expect(loadProfiles(storage)).toEqual([{ id: 'a', name: 'Alpha' }])
  })

  it('ignores corrupted stored lists', () => {
    const storage = createMemoryStorage()
    storage.setItem(STORAGE_KEYS.PROFILES, '{bad')
    expect(loadProfiles(storage)).toEqual([])
  })

  it('salvages an over-long name instead of discarding the whole registry', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      STORAGE_KEYS.PROFILES,
      JSON.stringify([
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'x'.repeat(80) },
      ]),
    )
    const profiles = loadProfiles(storage)
    expect(profiles.map((p) => p.id)).toEqual(['a', 'b']) // neither lost
    expect(profiles[1]!.name.length).toBeLessThanOrEqual(50)
  })

  it('drops only entries with no usable id, keeping the rest', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      STORAGE_KEYS.PROFILES,
      JSON.stringify([{ id: 'a', name: 'Alpha' }, { name: 'no id' }, 42, null]),
    )
    expect(loadProfiles(storage).map((p) => p.id)).toEqual(['a'])
  })
})

describe('hasStoredProfile', () => {
  it('reports blob presence independent of decodability', () => {
    const storage = createMemoryStorage()
    expect(hasStoredProfile(storage, 'p1')).toBe(false)
    storage.setItem(profileKey('p1'), '{"totally":"broken"}')
    expect(hasStoredProfile(storage, 'p1')).toBe(true)
    expect(loadProfileData(storage, 'p1')).toBeNull() // present but undecodable
  })
})

describe('active profile id', () => {
  it('round-trips and defaults to null', () => {
    const storage = createMemoryStorage()
    expect(loadActiveProfileId(storage)).toBeNull()
    saveActiveProfileId(storage, 'p1')
    expect(loadActiveProfileId(storage)).toBe('p1')
  })
})

describe('profile data', () => {
  it('round-trips app data per profile', () => {
    const storage = createMemoryStorage()
    const data = createEmptyAppData(NOW)
    saveProfileData(storage, 'p1', data, NOW)
    expect(loadProfileData(storage, 'p1')).toEqual(data)
    expect(loadProfileData(storage, 'other')).toBeNull()
  })

  it('deletes profile data', () => {
    const storage = createMemoryStorage()
    saveProfileData(storage, 'p1', createEmptyAppData(NOW), NOW)
    deleteProfileData(storage, 'p1')
    expect(loadProfileData(storage, 'p1')).toBeNull()
  })
})

describe('ensureClientId', () => {
  it('creates a stable client id', () => {
    const storage = createMemoryStorage()
    const id = ensureClientId(storage)
    expect(id).toBeTruthy()
    expect(ensureClientId(storage)).toBe(id)
  })
})
