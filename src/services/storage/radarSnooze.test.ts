import { createMemoryStorage } from './localStore'
import { STORAGE_KEYS } from './keys'
import { loadSnoozes, saveSnoozes, snoozeSignal, unsnoozeSignal } from './radarSnooze'

const TODAY = '2026-03-02'

describe('radar snooze storage', () => {
  it('round-trips today’s snoozes', () => {
    const storage = createMemoryStorage()
    saveSnoozes(storage, snoozeSignal({}, 'hw:c1:h1', TODAY))
    expect(loadSnoozes(storage, TODAY)).toEqual({ 'hw:c1:h1': TODAY })
  })

  it('drops entries from other days, malformed values and blank ids on read', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      STORAGE_KEYS.RADAR_SNOOZE,
      JSON.stringify({
        'hw:c1:h1': TODAY,
        'hw:c1:h2': '2026-03-01',
        'hw:c1:h3': 'not-a-date',
        'hw:c1:h4': 42,
        '': TODAY,
      }),
    )
    expect(loadSnoozes(storage, TODAY)).toEqual({ 'hw:c1:h1': TODAY })
  })

  it('treats missing, unparseable or non-object storage as empty', () => {
    const storage = createMemoryStorage()
    expect(loadSnoozes(storage, TODAY)).toEqual({})
    storage.setItem(STORAGE_KEYS.RADAR_SNOOZE, '{not json')
    expect(loadSnoozes(storage, TODAY)).toEqual({})
    storage.setItem(STORAGE_KEYS.RADAR_SNOOZE, '[1,2]')
    expect(loadSnoozes(storage, TODAY)).toEqual({})
    storage.setItem(STORAGE_KEYS.RADAR_SNOOZE, 'null')
    expect(loadSnoozes(storage, TODAY)).toEqual({})
  })

  it('removes the key entirely when the last snooze is cleared', () => {
    const storage = createMemoryStorage()
    const map = snoozeSignal({}, 'a', TODAY)
    saveSnoozes(storage, map)
    expect(storage.getItem(STORAGE_KEYS.RADAR_SNOOZE)).not.toBeNull()
    saveSnoozes(storage, unsnoozeSignal(map, 'a'))
    expect(storage.getItem(STORAGE_KEYS.RADAR_SNOOZE)).toBeNull()
  })

  it('snooze/unsnooze never mutate their input', () => {
    const base = snoozeSignal({}, 'a', TODAY)
    const withB = snoozeSignal(base, 'b', TODAY)
    expect(base).toEqual({ a: TODAY })
    expect(withB).toEqual({ a: TODAY, b: TODAY })
    const without = unsnoozeSignal(withB, 'a')
    expect(without).toEqual({ b: TODAY })
    expect(withB).toEqual({ a: TODAY, b: TODAY })
    // Unsnoozing an unknown id returns the same map.
    expect(unsnoozeSignal(without, 'zzz')).toBe(without)
  })
})
