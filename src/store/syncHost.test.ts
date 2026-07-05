import { createStorageSyncHost } from './syncHost'
import { createSession } from './session'
import {
  createMemoryStorage,
  loadProfileData,
  saveProfiles,
  saveProfileData,
} from '@/services/storage/localStore'
import { createEmptyAppData } from '@/domain/model'
import { createSemester } from '@/domain/semester'
import type { CloudPayload } from '@/domain/merge'

const NOW = new Date('2026-07-04T12:00:00Z')

describe('createStorageSyncHost', () => {
  it('getLocalPayload reads every profile from storage', () => {
    const storage = createMemoryStorage()
    const session = createSession({ storage, now: () => NOW })
    const activeId = session.profilesStore.getState().activeProfileId
    const host = createStorageSyncHost(storage, session)

    const payload = host.getLocalPayload()
    expect(payload.activeProfileId).toBe(activeId)
    expect(payload.profiles).toHaveLength(1)
    expect(payload.profiles[0]!.id).toBe(activeId)
    expect(payload.profiles[0]!.data).not.toBeNull()
  })

  it('applyRemotePayload writes profiles back and refreshes the session', () => {
    const storage = createMemoryStorage()
    const session = createSession({ storage, now: () => NOW })
    const activeId = session.profilesStore.getState().activeProfileId
    const host = createStorageSyncHost(storage, session)

    const remoteData = createEmptyAppData(NOW.toISOString())
    remoteData.semesters.push(createSemester('Winter 2026-2027', 'rs'))
    const payload: CloudPayload = {
      activeProfileId: activeId,
      profiles: [
        {
          id: activeId,
          name: 'Renamed Remotely',
          lastModified: NOW.toISOString(),
          data: remoteData,
        },
      ],
    }

    host.applyRemotePayload(payload)

    // Storage + session both reflect the remote change.
    expect(loadProfileData(storage, activeId)!.semesters[0]!.name).toBe('Winter 2026-2027')
    expect(session.appStore.getState().data.semesters[0]!.name).toBe('Winter 2026-2027')
    expect(session.profilesStore.getState().profiles[0]!.name).toBe('Renamed Remotely')
  })

  it('falls back to the first profile when the active id is unknown', () => {
    const storage = createMemoryStorage()
    saveProfiles(storage, [{ id: 'x', name: 'X' }])
    const data = createEmptyAppData(NOW.toISOString())
    data.semesters.push(createSemester('Spring 2026', 's'))
    saveProfileData(storage, 'x', data, data.lastModified)
    const session = createSession({ storage, now: () => NOW })
    const host = createStorageSyncHost(storage, session)

    host.applyRemotePayload({
      activeProfileId: 'ghost',
      profiles: [{ id: 'x', name: 'X', lastModified: NOW.toISOString(), data }],
    })
    expect(session.profilesStore.getState().activeProfileId).toBe('x')
  })
})
