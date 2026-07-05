import { createFakeBackend } from './fakeBackend'
import { buildCloudRecord } from './protocol'
import type { CloudPayload } from '@/domain/merge'

const NOW = new Date('2026-07-04T12:00:00Z')
const payload: CloudPayload = { activeProfileId: null, profiles: [] }

describe('fakeBackend', () => {
  it('records saves and returns the last stored value from load', async () => {
    const backend = createFakeBackend()
    expect(await backend.load()).toBeNull()
    const record = buildCloudRecord(payload, 'c', 'w', NOW)
    await backend.save(record)
    expect(backend.saved).toHaveLength(1)
    expect(await backend.load()).toEqual(record)
  })

  it('notifies subscribers on emitRemote and stops after unsubscribe', () => {
    const backend = createFakeBackend()
    const seen: unknown[] = []
    const unsubscribe = backend.subscribe((raw) => seen.push(raw))
    backend.emitRemote({ hello: 1 })
    expect(seen).toEqual([{ hello: 1 }])
    unsubscribe()
    backend.emitRemote({ hello: 2 })
    expect(seen).toHaveLength(1)
  })

  it('setStored seeds the next load', async () => {
    const backend = createFakeBackend()
    backend.setStored({ seeded: true })
    expect(await backend.load()).toEqual({ seeded: true })
  })
})
