import { createSyncController } from './syncController'
import { createSession } from './session'
import { createFakeBackend, type FakeBackend } from '@/services/sync/fakeBackend'
import { buildCloudRecord } from '@/services/sync/protocol'
import type { AuthService, AuthUser } from '@/services/firebase/auth'
import { createMemoryStorage } from '@/services/storage/localStore'
import { appDataSchema } from '@/domain/model'
import type { CloudPayload } from '@/domain/merge'

const NOW = new Date('2026-07-04T12:00:00Z')

/** A controllable AuthService whose state can be driven from the test. */
function makeFakeAuth() {
  let user: AuthUser | null = null
  const listeners = new Set<(u: AuthUser | null) => void>()
  const emit = () => listeners.forEach((l) => l(user))
  const auth: AuthService = {
    currentUser: () => user,
    onChange: (cb) => {
      listeners.add(cb)
      cb(user)
      return () => listeners.delete(cb)
    },
    signIn: async () => {
      user = { uid: 'u1', email: 'student@technion.ac.il' }
      emit()
    },
    signOut: async () => {
      user = null
      emit()
    },
  }
  return auth
}

function setup() {
  const storage = createMemoryStorage()
  const session = createSession({ storage, now: () => NOW })
  const auth = makeFakeAuth()
  let backend: FakeBackend | null = null
  const controller = createSyncController({
    session,
    storage,
    clientId: 'client-me',
    auth,
    now: () => NOW,
    debounceMs: 500,
    createBackend: () => {
      backend = createFakeBackend()
      return backend
    },
  })
  return { session, storage, controller, getBackend: () => backend }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createSyncController', () => {
  it('starts idle and unauthenticated', () => {
    const { controller } = setup()
    expect(controller.store.getState().status).toBe('idle')
    expect(controller.store.getState().userEmail).toBeNull()
  })

  it('starts the engine and records the user on sign-in', async () => {
    const { controller, getBackend } = setup()
    await controller.signIn()
    // start() pushes once and marks synced.
    expect(controller.store.getState().userEmail).toBe('student@technion.ac.il')
    expect(getBackend()!.saved.length).toBeGreaterThanOrEqual(1)
    expect(controller.store.getState().status).toBe('synced')
  })

  it('forwards debounced local changes to the engine', async () => {
    vi.useFakeTimers()
    const { controller, getBackend } = setup()
    await controller.signIn()
    const backend = getBackend()!
    backend.saved.length = 0

    controller.notifyLocalChange()
    await vi.advanceTimersByTimeAsync(500)
    expect(backend.saved).toHaveLength(1)
  })

  it('applies a genuine remote update to the session', async () => {
    const { controller, session, getBackend } = setup()
    await controller.signIn()
    const activeId = session.profilesStore.getState().activeProfileId

    const remotePayload: CloudPayload = {
      activeProfileId: activeId,
      profiles: [
        {
          id: activeId,
          name: 'Cloud Name',
          lastModified: NOW.toISOString(),
          data: {
            semesters: [
              {
                id: 'rs',
                name: 'Cloud Semester',
                courses: [],
                calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
                examViewMode: 'auto',
                hiddenExamIds: [],
                customExams: [],
              },
            ],
            settings: {
              theme: 'light',
              colorTheme: 'colorful',
              baseColorHue: 200,
              showCompleted: true,
              showWatchedRecordings: false,
            },
            lastModified: NOW.toISOString(),
          },
        },
      ],
    }
    getBackend()!.emitRemote(buildCloudRecord(remotePayload, 'other-client', 'w-remote', NOW))

    expect(session.appStore.getState().data.semesters[0]!.name).toBe('Cloud Semester')
  })

  it('tears down the engine and clears the user on sign-out', async () => {
    const { controller } = setup()
    await controller.signIn()
    await controller.signOut()
    expect(controller.store.getState().userEmail).toBeNull()
    expect(controller.store.getState().status).toBe('idle')
  })

  it('does not re-push after applying a genuine remote update (no echo loop)', async () => {
    vi.useFakeTimers()
    const { controller, session, getBackend } = setup()
    await controller.signIn()
    const activeId = session.profilesStore.getState().activeProfileId
    const backend = getBackend()!
    backend.saved.length = 0

    const remotePayload: CloudPayload = {
      activeProfileId: activeId,
      profiles: [
        {
          id: activeId,
          name: 'Cloud',
          lastModified: NOW.toISOString(),
          data: appDataSchema.parse({
            semesters: [{ id: 'rs', name: 'Cloud Semester' }],
            settings: {},
            lastModified: NOW.toISOString(),
          }),
        },
      ],
    }
    backend.emitRemote(buildCloudRecord(remotePayload, 'other-client', 'w-remote', NOW))

    // Applying the remote refreshes the session; that must NOT loop back into a push.
    await vi.advanceTimersByTimeAsync(1000)
    expect(backend.saved).toHaveLength(0)
    expect(session.appStore.getState().data.semesters[0]!.name).toBe('Cloud Semester')
  })

  it('surfaces a failed engine start as error status without throwing', async () => {
    const storage = createMemoryStorage()
    const session = createSession({ storage, now: () => NOW })
    const auth = makeFakeAuth()
    const controller = createSyncController({
      session,
      storage,
      clientId: 'c',
      auth,
      now: () => NOW,
      createBackend: () => {
        const b = createFakeBackend()
        b.load = () => Promise.reject(new Error('load failed'))
        return b
      },
    })

    await expect(controller.signIn()).resolves.toBeUndefined()
    expect(controller.store.getState().status).toBe('error')
  })
})
