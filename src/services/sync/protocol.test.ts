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
})

describe('normalizeCloudRecord — legacy formats', () => {
  it('reads a v2 compact record (w/c echo fields, compact profile blob)', () => {
    const v2 = {
      v: 2,
      u: NOW.toISOString(),
      w: 'legacy-write',
      c: 'legacy-client',
      payload: {
        a: 'p1',
        p: [
          {
            i: 'p1',
            n: 'Legacy',
            t: NOW.toISOString(),
            d: { v: 2, t: NOW.toISOString(), d: [{ i: 's', n: 'Winter 2025-2026', c: [] }] },
          },
        ],
      },
    }
    const normalized = normalizeCloudRecord(v2)
    expect(normalized!.clientId).toBe('legacy-client')
    expect(normalized!.writeId).toBe('legacy-write')
    expect(normalized!.payload.profiles[0]!.data!.semesters[0]!.name).toBe('Winter 2025-2026')
  })

  it('reads a v1 record', () => {
    const v1 = {
      version: 1,
      profiles: [
        {
          id: 'p1',
          name: 'Old',
          updatedAt: NOW.toISOString(),
          export: { data: { semesters: [{ id: 's', name: 'Spring 2024' }] } },
        },
      ],
    }
    const normalized = normalizeCloudRecord(v1)
    expect(normalized!.payload.profiles[0]!.data!.semesters[0]!.name).toBe('Spring 2024')
    expect(normalized!.clientId).toBeNull()
  })

  it('returns null for junk', () => {
    expect(normalizeCloudRecord(null)).toBeNull()
    expect(normalizeCloudRecord('nope')).toBeNull()
    expect(normalizeCloudRecord({ foo: 'bar' })).toBeNull()
  })
})
