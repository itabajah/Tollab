import type { CloudBackend } from './backend'
import type { CloudRecordV3 } from './protocol'

export interface FakeBackend extends CloudBackend {
  /** Every record passed to save(), in order. */
  readonly saved: CloudRecordV3[]
  /** Pushes a raw remote value to all current subscribers. */
  emitRemote(raw: unknown): void
  /** Seeds the value returned by the next load(). */
  setStored(raw: unknown): void
}

/** In-memory CloudBackend for unit tests and E2E builds. */
export function createFakeBackend(): FakeBackend {
  let stored: unknown = null
  const saved: CloudRecordV3[] = []
  const listeners = new Set<(raw: unknown) => void>()

  return {
    saved,
    async load() {
      return stored
    },
    async save(record) {
      saved.push(record)
      stored = record
    },
    subscribe(onValue) {
      listeners.add(onValue)
      return () => listeners.delete(onValue)
    },
    emitRemote(raw) {
      stored = raw
      for (const listener of listeners) listener(raw)
    },
    setStored(raw) {
      stored = raw
    },
  }
}
