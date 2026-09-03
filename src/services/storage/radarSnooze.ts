import { STORAGE_KEYS } from './keys'
import type { StorageLike } from './localStore'

/**
 * Radar snoozes: signal id → the local calendar day (YYYY-MM-DD) on which the
 * signal is hidden. A snooze always lasts "until tomorrow", so the map only
 * ever needs today's entries; anything else is stale and dropped on read.
 * Device-local UI state — deliberately NOT part of the synced AppData.
 */
export type SnoozeMap = Readonly<Record<string, string>>

const YMD = /^\d{4}-\d{2}-\d{2}$/

/** Loads today's snoozes; malformed storage or stale entries yield an empty map. */
export function loadSnoozes(storage: StorageLike, today: string): SnoozeMap {
  const raw = storage.getItem(STORAGE_KEYS.RADAR_SNOOZE)
  if (raw === null) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  const out: Record<string, string> = {}
  for (const [id, day] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof day === 'string' && YMD.test(day) && day === today && id.length > 0) out[id] = day
  }
  return out
}

export function saveSnoozes(storage: StorageLike, map: SnoozeMap): void {
  if (Object.keys(map).length === 0) storage.removeItem(STORAGE_KEYS.RADAR_SNOOZE)
  else storage.setItem(STORAGE_KEYS.RADAR_SNOOZE, JSON.stringify(map))
}

/** Hides `id` for `today`. Returns a NEW map. */
export function snoozeSignal(map: SnoozeMap, id: string, today: string): SnoozeMap {
  return { ...map, [id]: today }
}

/** Un-hides `id`. Returns a NEW map (same content when the id was not snoozed). */
export function unsnoozeSignal(map: SnoozeMap, id: string): SnoozeMap {
  if (!(id in map)) return map
  const next: Record<string, string> = { ...map }
  delete next[id]
  return next
}
