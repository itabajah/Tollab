import { createSession, type Session } from './session'
import {
  createMemoryStorage,
  loadProfileData,
  saveProfiles,
  saveProfileData,
  saveActiveProfileId,
  type StorageLike,
} from '@/services/storage/localStore'
import { STORAGE_KEYS, profileKey } from '@/services/storage/keys'
import { createEmptyAppData, courseSchema } from '@/domain/model'
import { createSemester } from '@/domain/semester'

const T1 = new Date('2026-07-04T12:00:00.000Z')

function makeSession(
  storage: StorageLike = createMemoryStorage(),
  extra: Partial<Parameters<typeof createSession>[0]> = {},
): Session {
  return createSession({ storage, now: () => T1, saveDebounceMs: 250, ...extra })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('bootstrap', () => {
  it('creates a Default Profile on a fresh install', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const { profiles, activeProfileId } = session.profilesStore.getState()
    expect(profiles).toHaveLength(1)
    expect(profiles[0]!.name).toBe('Default Profile')
    expect(activeProfileId).toBe(profiles[0]!.id)
    expect(session.appStore.getState().data.semesters).toEqual([])
    // persisted immediately so a reload finds it
    expect(loadProfileData(storage, activeProfileId)).not.toBeNull()
  })

  it('recovers when the active profile id points nowhere', () => {
    const storage = createMemoryStorage()
    const first = makeSession(storage)
    const goodId = first.profilesStore.getState().activeProfileId
    first.dispose()
    storage.setItem(STORAGE_KEYS.ACTIVE, 'ghost')
    const session = makeSession(storage)
    expect(session.profilesStore.getState().activeProfileId).toBe(goodId)
  })

  it('preserves unreadable active-profile bytes instead of overwriting them with empty', () => {
    const storage = createMemoryStorage()
    const id = 'p1'
    saveProfiles(storage, [{ id, name: 'Mine' }])
    saveActiveProfileId(storage, id)
    const corruptBytes = '{"v":3,"savedAt":"x","data":{"semesters":"not-an-array"}}'
    storage.setItem(profileKey(id), corruptBytes)

    const onSaveError = vi.fn()
    const session = makeSession(storage, { onSaveError })

    expect(session.appStore.getState().data.semesters).toEqual([]) // shows empty in memory
    expect(storage.getItem(profileKey(id))).toBe(corruptBytes) // but did NOT overwrite
    expect(onSaveError).toHaveBeenCalled()
  })

  it('clamps an over-long imported profile name so the registry survives a reload', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    session.importProfile({
      profileName: 'y'.repeat(80),
      data: createEmptyAppData(T1.toISOString()),
    })
    session.dispose()

    const reloaded = makeSession(storage)
    expect(reloaded.profilesStore.getState().profiles.length).toBeGreaterThanOrEqual(2)
  })
})

describe('debounced persistence', () => {
  it('saves data changes after the debounce window and stamps lastModified', () => {
    vi.useFakeTimers()
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const id = session.profilesStore.getState().activeProfileId

    session.appStore.getState().addSemester('Spring 2026')
    // not yet written
    expect(loadProfileData(storage, id)!.semesters).toEqual([])
    vi.advanceTimersByTime(250)
    const stored = loadProfileData(storage, id)!
    expect(stored.semesters[0]!.name).toBe('Spring 2026')
    expect(stored.lastModified).toBe(T1.toISOString())
  })

  it('coalesces rapid changes into one write burst', () => {
    vi.useFakeTimers()
    const storage = createMemoryStorage()
    const setSpy = vi.fn(storage.setItem.bind(storage))
    const spied: StorageLike = { ...storage, setItem: setSpy }
    const session = createSession({ storage: spied, now: () => T1, saveDebounceMs: 250 })
    setSpy.mockClear()

    session.appStore.getState().addSemester('A 2026')
    session.appStore.getState().addSemester('B 2026')
    session.appStore.getState().addSemester('C 2026')
    vi.advanceTimersByTime(250)
    expect(setSpy).toHaveBeenCalledTimes(1)
  })

  it('notifies onDirty immediately on every local change', () => {
    vi.useFakeTimers()
    const onDirty = vi.fn()
    const session = makeSession(createMemoryStorage(), { onDirty })
    session.appStore.getState().addSemester('Spring 2026')
    expect(onDirty).toHaveBeenCalledTimes(1)
  })

  it('surfaces storage failures through onSaveError', () => {
    vi.useFakeTimers()
    const storage = createMemoryStorage()
    const onSaveError = vi.fn()
    const session = createSession({ storage, now: () => T1, saveDebounceMs: 250, onSaveError })
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }
    session.appStore.getState().addSemester('Spring 2026')
    vi.advanceTimersByTime(250)
    expect(onSaveError).toHaveBeenCalledTimes(1)
  })

  it('flush() writes pending changes immediately', () => {
    vi.useFakeTimers()
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const id = session.profilesStore.getState().activeProfileId
    session.appStore.getState().addSemester('Spring 2026')
    session.flush()
    expect(loadProfileData(storage, id)!.semesters).toHaveLength(1)
  })

  it('retries a failed save on the next flush instead of dropping the change', () => {
    vi.useFakeTimers()
    const storage = createMemoryStorage()
    const onSaveError = vi.fn()
    const session = createSession({ storage, now: () => T1, saveDebounceMs: 250, onSaveError })
    const id = session.profilesStore.getState().activeProfileId

    let failWrites = true
    const realSet = storage.setItem.bind(storage)
    storage.setItem = (k, v) => {
      if (failWrites && k === profileKey(id)) {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      realSet(k, v)
    }

    session.appStore.getState().addSemester('Spring 2026')
    vi.advanceTimersByTime(250)
    expect(onSaveError).toHaveBeenCalledTimes(1)
    expect(loadProfileData(storage, id)!.semesters).toEqual([]) // write failed

    failWrites = false
    session.flush() // still dirty → retried
    expect(loadProfileData(storage, id)!.semesters).toHaveLength(1)
  })

  it('persists per-course sort prefs across a reload (the legacy defect this rebuild fixes)', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    session.appStore.getState().addSemester('Spring 2026')
    session.appStore
      .getState()
      .addCourse(courseSchema.parse({ id: 'c1', name: 'Algo', color: 'hsl(0, 45%, 50%)' }))
    session.appStore.getState().setHomeworkSort('c1', 'name_asc')
    session.appStore.getState().setRecordingSort('c1', 'lectures', 'watched_first')
    session.appStore.getState().setShowCompletedHomework('c1', false)
    session.flush()
    session.dispose()

    // Reload from the same storage — the prefs must survive (lost in the legacy app).
    const reloaded = makeSession(storage)
    const course = reloaded.appStore.getState().data.semesters[0]!.courses[0]!
    expect(course.homeworkSort).toBe('name_asc')
    expect(course.recordingsSort.lectures).toBe('watched_first')
    expect(course.showCompletedHomework).toBe(false)
  })
})

describe('profile ops notify sync', () => {
  it('fires onDirty for create / rename / switch / delete', () => {
    const onDirty = vi.fn()
    const session = makeSession(createMemoryStorage(), { onDirty })
    const aId = session.profilesStore.getState().activeProfileId
    onDirty.mockClear() // ignore bootstrap

    session.createProfile('B')
    const bId = session.profilesStore.getState().activeProfileId
    session.renameProfile(bId, 'B renamed')
    session.switchProfile(aId)
    session.deleteProfile(bId)

    expect(onDirty.mock.calls.length).toBeGreaterThanOrEqual(4)
  })
})

describe('profile lifecycle', () => {
  it('creates, switches to, and persists a new profile', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const result = session.createProfile('Uni Stuff')
    expect(result.ok).toBe(true)
    const { profiles, activeProfileId } = session.profilesStore.getState()
    expect(profiles).toHaveLength(2)
    expect(profiles[1]!.name).toBe('Uni Stuff')
    expect(activeProfileId).toBe(profiles[1]!.id)
    expect(session.appStore.getState().data.semesters).toEqual([])
    expect(loadProfileData(storage, activeProfileId)).not.toBeNull()
  })

  it('rejects duplicate profile names case-insensitively', () => {
    const session = makeSession()
    session.createProfile('Uni')
    const dup = session.createProfile('uni')
    expect(dup.ok).toBe(false)
  })

  it('rejects empty and over-long names', () => {
    const session = makeSession()
    expect(session.createProfile('').ok).toBe(false)
    expect(session.createProfile('x'.repeat(51)).ok).toBe(false)
  })

  it('flushes pending data of the old profile before switching', () => {
    vi.useFakeTimers()
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const firstId = session.profilesStore.getState().activeProfileId

    session.appStore.getState().addSemester('Spring 2026') // pending debounce
    session.createProfile('Second') // switches immediately

    const firstData = loadProfileData(storage, firstId)!
    expect(firstData.semesters).toHaveLength(1) // was flushed, not lost
    const secondId = session.profilesStore.getState().activeProfileId
    expect(loadProfileData(storage, secondId)!.semesters).toEqual([])
  })

  it('switchProfile loads the target data', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const firstId = session.profilesStore.getState().activeProfileId
    session.appStore.getState().addSemester('Spring 2026')
    session.createProfile('Second')

    session.switchProfile(firstId)
    expect(session.profilesStore.getState().activeProfileId).toBe(firstId)
    expect(session.appStore.getState().data.semesters).toHaveLength(1)
  })

  it('renames a profile and bumps its data lastModified so the rename wins merges', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const id = session.profilesStore.getState().activeProfileId
    const result = session.renameProfile(id, 'Renamed')
    expect(result.ok).toBe(true)
    expect(session.profilesStore.getState().profiles[0]!.name).toBe('Renamed')
    expect(loadProfileData(storage, id)!.lastModified).toBe(T1.toISOString())
  })

  it('deletes a profile and switches to the remaining one', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const firstId = session.profilesStore.getState().activeProfileId
    session.createProfile('Second')
    const secondId = session.profilesStore.getState().activeProfileId

    session.deleteProfile(secondId)
    expect(session.profilesStore.getState().profiles.map((p) => p.id)).toEqual([firstId])
    expect(session.profilesStore.getState().activeProfileId).toBe(firstId)
    expect(loadProfileData(storage, secondId)).toBeNull()
  })

  it('recreates a Default Profile when the last profile is deleted', () => {
    const session = makeSession()
    const onlyId = session.profilesStore.getState().activeProfileId
    session.deleteProfile(onlyId)
    const { profiles, activeProfileId } = session.profilesStore.getState()
    expect(profiles).toHaveLength(1)
    expect(profiles[0]!.name).toBe('Default Profile')
    expect(profiles[0]!.id).not.toBe(onlyId)
    expect(activeProfileId).toBe(profiles[0]!.id)
  })
})

describe('refreshFromStorage', () => {
  it('reloads profiles, active id and active data written externally (e.g. by sync)', () => {
    const storage = createMemoryStorage()
    const session = makeSession(storage)
    const firstId = session.profilesStore.getState().activeProfileId

    // Simulate the sync engine writing a new profile + switching active externally.
    const extraId = 'remote-profile'
    const remoteData = createEmptyAppData(T1.toISOString())
    remoteData.semesters.push(createSemester('Winter 2026-2027', 'remote-sem'))
    saveProfiles(storage, [
      { id: firstId, name: 'Default Profile' },
      { id: extraId, name: 'From Another Device' },
    ])
    saveProfileData(storage, extraId, remoteData, remoteData.lastModified)
    saveActiveProfileId(storage, extraId)

    session.refreshFromStorage()

    expect(session.profilesStore.getState().profiles.map((p) => p.name)).toContain(
      'From Another Device',
    )
    expect(session.profilesStore.getState().activeProfileId).toBe(extraId)
    expect(session.appStore.getState().data.semesters[0]!.name).toBe('Winter 2026-2027')
  })

  it('does not trigger a dirty save when refreshing', () => {
    vi.useFakeTimers()
    const storage = createMemoryStorage()
    const onDirty = vi.fn()
    const session = makeSession(storage, { onDirty })
    session.refreshFromStorage()
    expect(onDirty).not.toHaveBeenCalled()
  })
})

describe('import / export', () => {
  it('imports as a new profile with a unique name and switches to it', () => {
    const session = makeSession()
    session.createProfile('Backup')
    const imported = session.importProfile({
      profileName: 'Backup',
      data: session.appStore.getState().data,
    })
    expect(imported.name).toBe('Backup (2)')
    const { profiles, activeProfileId } = session.profilesStore.getState()
    expect(profiles.map((p) => p.name)).toContain('Backup (2)')
    expect(activeProfileId).toBe(imported.profileId)
  })

  it('falls back to "Imported" when the file has no profile name', () => {
    const session = makeSession()
    const imported = session.importProfile({
      profileName: null,
      data: session.appStore.getState().data,
    })
    expect(imported.name).toBe('Imported')
  })

  it('builds an export file for the active profile', () => {
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const file = session.buildExport()
    expect(file.format).toBe('tollab')
    expect(file.profile.name).toBe('Default Profile')
    expect(file.data.semesters).toHaveLength(1)
  })
})
