import { encodeStoredProfile, decodeStoredProfile } from './codec'
import { createEmptyAppData, appDataSchema } from '@/domain/model'

const NOW = '2026-07-04T10:00:00.000Z'

describe('storage codec v3', () => {
  it('round-trips app data losslessly', () => {
    const data = appDataSchema.parse({
      semesters: [
        {
          id: 's1',
          name: 'Winter 2025-2026',
          courses: [{ id: 'c1', name: 'Algo', color: 'hsl(137, 45%, 50%)' }],
        },
      ],
      settings: { theme: 'dark' },
      lastModified: NOW,
    })

    const encoded = encodeStoredProfile(data, NOW)
    const decoded = decodeStoredProfile(encoded)
    expect(decoded).toEqual(data)
  })

  it('wraps the payload in a v3 envelope', () => {
    const encoded = encodeStoredProfile(createEmptyAppData(NOW), NOW)
    const parsed = JSON.parse(encoded)
    expect(parsed.v).toBe(3)
    expect(parsed.savedAt).toBe(NOW)
    expect(parsed.data.semesters).toEqual([])
  })

  it('returns null for null / malformed / wrong-version input', () => {
    expect(decodeStoredProfile(null)).toBeNull()
    expect(decodeStoredProfile('not json')).toBeNull()
    expect(decodeStoredProfile('{"v":99,"data":{}}')).toBeNull()
    expect(
      decodeStoredProfile(JSON.stringify({ v: 3, savedAt: NOW, data: { bad: true } })),
    ).toBeNull()
  })

  it('degrades an unrecognized enum value to its default instead of discarding the profile', () => {
    const data = createEmptyAppData(NOW)
    // Simulate a newer build that wrote enum values this build doesn't know.
    const raw = JSON.stringify({
      v: 3,
      savedAt: NOW,
      data: { ...data, settings: { ...data.settings, colorTheme: 'neon', theme: 'sepia' } },
    })
    const decoded = decodeStoredProfile(raw)
    expect(decoded).not.toBeNull()
    expect(decoded!.settings.colorTheme).toBe('colorful')
    expect(decoded!.settings.theme).toBe('light')
  })
})
