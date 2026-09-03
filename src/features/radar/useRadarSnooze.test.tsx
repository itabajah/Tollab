import { act, renderHook } from '@testing-library/react'
import { createMemoryStorage } from '@/services/storage/localStore'
import { STORAGE_KEYS } from '@/services/storage/keys'
import { useRadarSnooze } from './useRadarSnooze'

const TODAY = '2026-03-02'

describe('useRadarSnooze', () => {
  it('starts empty, snoozes, persists, and unsnoozes', () => {
    const storage = createMemoryStorage()
    const { result } = renderHook(() => useRadarSnooze(TODAY, storage))
    expect(result.current.snoozedIds).toEqual([])

    act(() => result.current.snooze('hw:c1:h1'))
    expect(result.current.snoozedIds).toEqual(['hw:c1:h1'])
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.RADAR_SNOOZE)!)).toEqual({ 'hw:c1:h1': TODAY })

    act(() => result.current.unsnooze('hw:c1:h1'))
    expect(result.current.snoozedIds).toEqual([])
    expect(storage.getItem(STORAGE_KEYS.RADAR_SNOOZE)).toBeNull()
  })

  it('keeps the id list referentially stable across unrelated re-renders', () => {
    const { result, rerender } = renderHook(() => useRadarSnooze(TODAY, createMemoryStorage()))
    const first = result.current.snoozedIds
    rerender()
    expect(result.current.snoozedIds).toBe(first)
  })

  it('applies consecutive snoozes cumulatively', () => {
    const { result } = renderHook(() => useRadarSnooze(TODAY, createMemoryStorage()))
    act(() => {
      result.current.snooze('a')
      result.current.snooze('b')
    })
    expect(result.current.snoozedIds).toEqual(['a', 'b'])
  })

  it('expires yesterday’s snoozes when the day rolls over', () => {
    const storage = createMemoryStorage()
    const { result, rerender } = renderHook(({ today }) => useRadarSnooze(today, storage), {
      initialProps: { today: TODAY },
    })
    act(() => result.current.snooze('a'))
    expect(result.current.snoozedIds).toEqual(['a'])

    rerender({ today: '2026-03-03' })
    expect(result.current.snoozedIds).toEqual([])
    // A new snooze on the new day is stamped with that day.
    act(() => result.current.snooze('b'))
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.RADAR_SNOOZE)!)).toEqual({ b: '2026-03-03' })
  })

  it('reads existing snoozes from localStorage by default', () => {
    localStorage.setItem(STORAGE_KEYS.RADAR_SNOOZE, JSON.stringify({ x: TODAY }))
    const { result } = renderHook(() => useRadarSnooze(TODAY))
    expect(result.current.snoozedIds).toEqual(['x'])
  })

  it('keeps the snooze for the session when the write itself throws', () => {
    const storage = createMemoryStorage()
    const throwing = {
      ...storage,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    const { result } = renderHook(() => useRadarSnooze(TODAY, throwing))
    act(() => result.current.snooze('a'))
    expect(result.current.snoozedIds).toEqual(['a'])
  })

  it('falls back to memory when localStorage is unusable', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    try {
      const { result } = renderHook(() => useRadarSnooze(TODAY))
      act(() => result.current.snooze('a'))
      expect(result.current.snoozedIds).toEqual(['a'])
    } finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })
})
