import { useCallback, useMemo, useRef, useState } from 'react'
import { createMemoryStorage, type StorageLike } from '@/services/storage/localStore'
import {
  loadSnoozes,
  saveSnoozes,
  snoozeSignal,
  unsnoozeSignal,
  type SnoozeMap,
} from '@/services/storage/radarSnooze'

/**
 * localStorage when the browser allows it; an in-memory fallback otherwise
 * (private modes / embedded webviews can throw on access). A snooze that only
 * lasts the session is still better than a crash at the top of the app.
 */
function resolveStorage(): StorageLike {
  try {
    const storage = window.localStorage
    // Some browsers expose the object but throw on use.
    storage.getItem('tollab:probe')
    return storage
  } catch {
    return createMemoryStorage()
  }
}

export interface RadarSnooze {
  /** Signal ids hidden for `today`, stable across renders until a change. */
  snoozedIds: readonly string[]
  snooze: (id: string) => void
  unsnooze: (id: string) => void
}

/**
 * Device-local "hide until tomorrow" state for radar signals. `today` is the
 * local calendar day (YYYY-MM-DD); when it rolls over, yesterday's snoozes
 * expire automatically because only entries stamped with today survive a load.
 */
export function useRadarSnooze(today: string, storageOverride?: StorageLike): RadarSnooze {
  const storage = useMemo(() => storageOverride ?? resolveStorage(), [storageOverride])
  const [map, setMap] = useState<SnoozeMap>(() => loadSnoozes(storage, today))
  const [loadedFor, setLoadedFor] = useState(today)
  // Day rollover: re-read so stale entries drop out (render-time state sync).
  if (loadedFor !== today) {
    setLoadedFor(today)
    setMap(loadSnoozes(storage, today))
  }
  // The handlers read the latest map through a ref so they stay stable and
  // never write from inside a state updater (StrictMode runs those twice).
  const mapRef = useRef(map)
  mapRef.current = map

  const commit = useCallback(
    (next: SnoozeMap) => {
      mapRef.current = next
      saveSnoozes(storage, next)
      setMap(next)
    },
    [storage],
  )
  const snooze = useCallback(
    (id: string) => commit(snoozeSignal(mapRef.current, id, today)),
    [commit, today],
  )
  const unsnooze = useCallback((id: string) => commit(unsnoozeSignal(mapRef.current, id)), [commit])

  const snoozedIds = useMemo(() => Object.keys(map), [map])
  return { snoozedIds, snooze, unsnooze }
}
