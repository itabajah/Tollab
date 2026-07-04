import {
  createMemoryStorage,
  loadProfiles,
  saveProfiles,
  loadActiveProfileId,
  saveActiveProfileId,
  loadProfileData,
  saveProfileData,
  deleteProfileData,
  ensureClientId,
} from './localStore'
import { STORAGE_KEYS } from './keys'
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
