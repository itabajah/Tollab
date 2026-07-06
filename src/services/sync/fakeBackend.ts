import type { CloudBackend } from './backend'
import type { CloudRecordV3 } from './protocol'

export interface FakeBackend extends CloudBackend {
  /** Every record passed to save(), in order. */
  readonly saved: CloudRecordV3[]
  /** Pushes a raw remote value to all current subscribers. */
  emitRemote(raw: unknown): void
  /** Simulates the backend cancelling the subscription (permission/connection loss). */
  emitError(error?: unknown): void
  /** Seeds the value returned by the next load(). */
  setStored(raw: unknown): void
  /** Makes the next `count` load() calls reject, to exercise the start() retry path. */
  failNextLoads(count: number): void
}

/** In-memory CloudBackend for unit and component tests. */
export function createFakeBackend(): FakeBackend {
  let stored: unknown = null
  const saved: CloudRecordV3[] = []
  const listeners = new Set<(raw: unknown) => void>()
  const errorListeners = new Set<(error: unknown) => void>()
  let loadFailuresRemaining = 0

  return {
    saved,
    async load() {
      if (loadFailuresRemaining > 0) {
        loadFailuresRemaining--
        throw new Error('fake load failure')
      }
      return stored
    },
    async save(record) {
      saved.push(record)
      stored = record
    },
    subscribe(onValue, onError) {
      listeners.add(onValue)
      if (onError) errorListeners.add(onError)
      return () => {
        listeners.delete(onValue)
        if (onError) errorListeners.delete(onError)
      }
    },
    emitRemote(raw) {
      stored = raw
      for (const listener of listeners) listener(raw)
    },
    emitError(error) {
      for (const listener of errorListeners) listener(error)
    },
    setStored(raw) {
      stored = raw
    },
    failNextLoads(count) {
      loadFailuresRemaining = count
    },
  }
}
