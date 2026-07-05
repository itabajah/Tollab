import type { StorageLike } from '@/services/storage/localStore'
import type { CloudBackend } from '@/services/sync/backend'
import { createSyncEngine, type SyncEngine } from '@/services/sync/SyncEngine'
import type { AuthService } from '@/services/firebase/auth'
import { createStorageSyncHost } from './syncHost'
import { createSyncStore, type SyncStore } from './syncStore'
import type { Session } from './session'

export interface SyncControllerOptions {
  session: Session
  storage: StorageLike
  clientId: string
  auth: AuthService
  createBackend: (uid: string) => CloudBackend
  now?: () => Date
  debounceMs?: number
}

export interface SyncController {
  store: SyncStore
  notifyLocalChange: () => void
  flush: () => Promise<void>
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  dispose: () => void
}

/**
 * Owns the sync-engine lifecycle across auth state. On sign-in it spins up an
 * engine against a fresh backend for the user and starts it; on sign-out it
 * tears the engine down. Local changes and flushes forward to the active engine
 * (no-ops when signed out).
 */
export function createSyncController(options: SyncControllerOptions): SyncController {
  const { session, storage, clientId, auth, createBackend } = options
  const store = createSyncStore('idle')
  const host = createStorageSyncHost(storage, session)

  let engine: SyncEngine | null = null
  // Identifies the current engine so a torn-down engine's late onStatus
  // callbacks (its start() may resolve after stop) can't overwrite the status.
  let engineToken: object | null = null
  let startPromise: Promise<void> = Promise.resolve()

  const startEngine = (uid: string) => {
    // Tear down any existing engine first, so a direct account switch (A→B with
    // no intervening sign-out) can't leak engine A's subscription into B's session.
    stopEngine()
    const token = {}
    engineToken = token
    const backend = createBackend(uid)
    engine = createSyncEngine({
      backend,
      host,
      clientId,
      ...(options.debounceMs !== undefined ? { debounceMs: options.debounceMs } : {}),
      ...(options.now ? { now: options.now } : {}),
      onStatus: (status) => {
        if (engineToken === token) store.getState().setStatus(status)
      },
    })
    // start() sets 'error' internally on failure; swallow the rejection so the
    // auto-login path (which doesn't always await signIn) can't raise an
    // unhandled promise rejection.
    startPromise = engine.start().catch(() => {})
  }

  const stopEngine = () => {
    engineToken = null
    engine?.stop()
    engine = null
  }

  const unsubscribe = auth.onChange((user) => {
    if (user) {
      store.getState().setUserEmail(user.email)
      startEngine(user.uid)
    } else {
      stopEngine()
      store.getState().setUserEmail(null)
      store.getState().setStatus('idle')
    }
  })

  return {
    store,
    notifyLocalChange: () => engine?.notifyLocalChange(),
    flush: async () => {
      if (engine) await engine.flush()
    },
    signIn: async () => {
      await auth.signIn()
      await startPromise
    },
    signOut: () => auth.signOut(),
    dispose: () => {
      unsubscribe()
      stopEngine()
    },
  }
}
