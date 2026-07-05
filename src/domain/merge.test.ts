import { mergePayloads, compareIso, isEmptyProfile, type CloudPayload, type CloudProfile } from './merge'
import { appDataSchema, createEmptyAppData, type AppData } from './model'

const NOW = new Date('2026-07-04T12:00:00Z')

function dataAt(iso: string, semesterName = 'Spring 2026'): AppData {
  return appDataSchema.parse({
    semesters: [{ id: 's1', name: semesterName }],
    settings: {},
    lastModified: iso,
  })
}

function profile(id: string, name: string, iso: string | null, data: AppData | null): CloudProfile {
  return { id, name, lastModified: iso, data }
}

describe('compareIso', () => {
  it('orders present before missing and compares chronologically', () => {
    expect(compareIso(null, null)).toBe(0)
    expect(compareIso(null, '2026-01-01T00:00:00Z')).toBeLessThan(0)
    expect(compareIso('2026-01-01T00:00:00Z', null)).toBeGreaterThan(0)
    expect(compareIso('2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z')).toBeLessThan(0)
    expect(compareIso('bad', 'also-bad')).toBe(0)
  })
})

describe('isEmptyProfile', () => {
  it('treats null data or zero semesters as empty', () => {
    expect(isEmptyProfile(profile('p', 'P', NOW.toISOString(), null))).toBe(true)
    expect(isEmptyProfile(profile('p', 'P', NOW.toISOString(), createEmptyAppData(NOW.toISOString())))).toBe(true)
    expect(isEmptyProfile(profile('p', 'P', NOW.toISOString(), dataAt(NOW.toISOString())))).toBe(false)
  })
})

describe('mergePayloads', () => {
  it('unions distinct profiles from both sides', () => {
    const local: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Alpha', NOW.toISOString(), dataAt(NOW.toISOString()))],
    }
    const cloud: CloudPayload = {
      activeProfileId: 'b',
      profiles: [profile('b', 'Beta', NOW.toISOString(), dataAt(NOW.toISOString()))],
    }
    const merged = mergePayloads(local, cloud, NOW)
    expect(merged.profiles.map((p) => p.id).sort()).toEqual(['a', 'b'])
    expect(merged.activeProfileId).toBe('a') // local preferred
  })

  it('keeps the newer side for a shared profile (cloud newer)', () => {
    const local: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Local', '2026-01-01T00:00:00Z', dataAt('2026-01-01T00:00:00Z', 'Old'))],
    }
    const cloud: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Cloud', '2026-06-01T00:00:00Z', dataAt('2026-06-01T00:00:00Z', 'New'))],
    }
    const merged = mergePayloads(local, cloud, NOW)
    expect(merged.profiles[0]!.data!.semesters[0]!.name).toBe('New')
  })

  it('favours local on a timestamp tie', () => {
    const iso = '2026-03-01T00:00:00Z'
    const local: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Local', iso, dataAt(iso, 'LocalWins'))],
    }
    const cloud: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Cloud', iso, dataAt(iso, 'CloudLoses'))],
    }
    expect(mergePayloads(local, cloud, NOW).profiles[0]!.data!.semesters[0]!.name).toBe('LocalWins')
  })

  it('skips empty profiles so a fresh default never clobbers cloud data', () => {
    const local: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Empty', NOW.toISOString(), createEmptyAppData(NOW.toISOString()))],
    }
    const cloud: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Real', '2026-01-01T00:00:00Z', dataAt('2026-01-01T00:00:00Z', 'Cloud'))],
    }
    const merged = mergePayloads(local, cloud, NOW)
    expect(merged.profiles[0]!.data!.semesters[0]!.name).toBe('Cloud')
  })

  it('de-dupes colliding names across ids with numeric suffixes', () => {
    const local: CloudPayload = {
      activeProfileId: 'a',
      profiles: [profile('a', 'Uni', NOW.toISOString(), dataAt(NOW.toISOString()))],
    }
    const cloud: CloudPayload = {
      activeProfileId: 'b',
      profiles: [profile('b', 'Uni', NOW.toISOString(), dataAt(NOW.toISOString()))],
    }
    const names = mergePayloads(local, cloud, NOW).profiles.map((p) => p.name)
    expect(names).toContain('Uni')
    expect(names).toContain('Uni (2)')
  })

  it('resolves active to cloud when the local active is empty/dropped', () => {
    const local: CloudPayload = {
      activeProfileId: 'empty',
      profiles: [profile('empty', 'Empty', NOW.toISOString(), createEmptyAppData(NOW.toISOString()))],
    }
    const cloud: CloudPayload = {
      activeProfileId: 'b',
      profiles: [profile('b', 'Beta', NOW.toISOString(), dataAt(NOW.toISOString()))],
    }
    expect(mergePayloads(local, cloud, NOW).activeProfileId).toBe('b')
  })
})
