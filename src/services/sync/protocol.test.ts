import { buildCloudRecord, normalizeCloudRecord, cloudRecordSchema } from './protocol'
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

const payload: CloudPayload = {
  activeProfileId: 'p1',
  profiles: [
    { id: 'p1', name: 'Main', lastModified: NOW.toISOString(), data: data('Spring 2026') },
  ],
}

describe('buildCloudRecord / v3 round-trip', () => {
  it('builds a valid v3 record', () => {
    const record = buildCloudRecord(payload, 'client-a', 'write-1', NOW)
    expect(cloudRecordSchema.safeParse(record).success).toBe(true)
    expect(record.v).toBe(3)
  })

  it('normalizes a v3 record back, preserving echo fields', () => {
    const record = buildCloudRecord(payload, 'client-a', 'write-1', NOW)
    const normalized = normalizeCloudRecord(record)
    expect(normalized).not.toBeNull()
    expect(normalized!.clientId).toBe('client-a')
    expect(normalized!.writeId).toBe('write-1')
    expect(normalized!.payload.profiles[0]!.name).toBe('Main')
  })

  it('still reads a record whose null fields were dropped by Firebase (absent keys)', () => {
    // RTDB stores null by omitting the key; simulate the read-back shape.
    const fromFirebase = {
      v: 3,
      updatedAt: NOW.toISOString(),
      clientId: 'client-a',
      writeId: 'write-1',
      payload: {
        // activeProfileId omitted (was null)
        profiles: [{ id: 'p1', name: 'Main' /* lastModified + data omitted */ }],
      },
    }
    const normalized = normalizeCloudRecord(fromFirebase)
    expect(normalized).not.toBeNull()
    expect(normalized!.payload.activeProfileId).toBeNull()
    expect(normalized!.payload.profiles[0]!.lastModified).toBeNull()
    expect(normalized!.payload.profiles[0]!.data).toBeNull()
  })
})

describe('normalizeCloudRecord — rejects non-v3', () => {
  it('returns null for junk and for legacy (v1/v2) records', () => {
    expect(normalizeCloudRecord(null)).toBeNull()
    expect(normalizeCloudRecord('nope')).toBeNull()
    expect(normalizeCloudRecord({ foo: 'bar' })).toBeNull()
    // Legacy shapes are no longer understood — they must be ignored, not decoded.
    expect(normalizeCloudRecord({ v: 2, payload: { a: 'p1', p: [] } })).toBeNull()
    expect(normalizeCloudRecord({ version: 1, profiles: [] })).toBeNull()
  })
})
