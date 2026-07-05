import { createSyncEngine } from './SyncEngine'
import { createFakeBackend } from './fakeBackend'
import { buildCloudRecord } from './protocol'
import type { SyncHost } from './backend'
import { appDataSchema, type AppData } from '@/domain/model'
import type { CloudPayload } from '@/domain/merge'

const NOW = new Date('2026-07-04T12:00:00Z')

function data(name: string): AppData {
  return appDataSchema.parse({
    semesters: [{ id: 's1', name }],
    settings: {},
    lastModified: NOW.toISOString(),
  })
}

function payloadWith(id: string, name: string): CloudPayload {
  return {
    activeProfileId: id,
    profiles: [{ id, name, lastModified: NOW.toISOString(), data: data('Spring 2026') }],
  }
}

/** A controllable SyncHost whose local payload can be swapped between calls. */
function makeHost(initial: CloudPayload) {
  let local = initial
  const applied: CloudPayload[] = []
  const host: SyncHost = {
    getLocalPayload: () => local,
    applyRemotePayload: (p) => applied.push(p),
  }
  return { host, applied, setLocal: (p: CloudPayload) => (local = p) }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createSyncEngine', () => {
  it('on start, merges + pushes local and subscribes', async () => {
    const backend = createFakeBackend()
    const { host, applied } = makeHost(payloadWith('a', 'Alpha'))
    const engine = createSyncEngine({ backend, host, clientId: 'me', now: () => NOW })

    await engine.start()

    expect(backend.saved).toHaveLength(1)
    expect(backend.saved[0]!.payload.profiles[0]!.id).toBe('a')
    expect(applied).toHaveLength(1) // merged payload applied once
  })

  it('debounces rapid local changes into a single push', async () => {
    vi.useFakeTimers()
    const backend = createFakeBackend()
    const { host } = makeHost(payloadWith('a', 'Alpha'))
    const engine = createSyncEngine({
      backend,
      host,
      clientId: 'me',
      debounceMs: 750,
      now: () => NOW,
    })
    await engine.start()
    backend.saved.length = 0 // ignore the start push

    engine.notifyLocalChange()
    engine.notifyLocalChange()
    engine.notifyLocalChange()
    expect(backend.saved).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(750)
    expect(backend.saved).toHaveLength(1)
  })

  it('ignores an echoed own write (same clientId) — no apply, no re-push', async () => {
    const backend = createFakeBackend()
    const { host, applied } = makeHost(payloadWith('a', 'Alpha'))
    const engine = createSyncEngine({ backend, host, clientId: 'me', now: () => NOW })
    await engine.start()
    const appliedAfterStart = applied.length
    backend.saved.length = 0

    backend.emitRemote(buildCloudRecord(payloadWith('a', 'Echo'), 'me', 'w-echo', NOW))

    expect(applied).toHaveLength(appliedAfterStart) // not applied
    expect(backend.saved).toHaveLength(0) // not re-pushed
  })

  it('ignores an echoed own write by writeId even from a different clientId label', async () => {
    const backend = createFakeBackend()
    const { host, applied } = makeHost(payloadWith('a', 'Alpha'))
    const engine = createSyncEngine({ backend, host, clientId: 'me', now: () => NOW })
    await engine.start()
    const ownWriteId = backend.saved[0]!.writeId
    const before = applied.length

    backend.emitRemote(buildCloudRecord(payloadWith('a', 'X'), 'other', ownWriteId, NOW))
    expect(applied).toHaveLength(before)
  })

  it('applies a genuine remote write without pushing back', async () => {
    const backend = createFakeBackend()
    const { host, applied } = makeHost(payloadWith('a', 'Alpha'))
    const engine = createSyncEngine({ backend, host, clientId: 'me', now: () => NOW })
    await engine.start()
    const before = applied.length
    backend.saved.length = 0

    backend.emitRemote(
      buildCloudRecord(payloadWith('b', 'Remote'), 'someone-else', 'w-remote', NOW),
    )

    expect(applied).toHaveLength(before + 1)
    expect(applied[applied.length - 1]!.profiles[0]!.id).toBe('b')
    expect(backend.saved).toHaveLength(0) // apply must not trigger a push
  })

  it('flush() pushes immediately, cancelling any pending debounce', async () => {
    vi.useFakeTimers()
    const backend = createFakeBackend()
    const { host } = makeHost(payloadWith('a', 'Alpha'))
    const engine = createSyncEngine({
      backend,
      host,
      clientId: 'me',
      debounceMs: 750,
      now: () => NOW,
    })
    await engine.start()
    backend.saved.length = 0

    engine.notifyLocalChange()
    await engine.flush()
    expect(backend.saved).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(750)
    expect(backend.saved).toHaveLength(1) // debounce was cancelled by flush
  })

  it('reports status transitions', async () => {
    const backend = createFakeBackend()
    const { host } = makeHost(payloadWith('a', 'Alpha'))
    const statuses: string[] = []
    const engine = createSyncEngine({
      backend,
      host,
      clientId: 'me',
      now: () => NOW,
      onStatus: (s) => statuses.push(s),
    })
    await engine.start()
    expect(statuses).toContain('connecting')
    expect(statuses[statuses.length - 1]).toBe('synced')
    engine.stop()
    expect(statuses[statuses.length - 1]).toBe('idle')
  })
})
