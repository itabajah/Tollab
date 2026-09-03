// ---------------------------------------------------------------------------
// Deterministic picking — the radar's only source of "randomness"
// ---------------------------------------------------------------------------

/**
 * A number that is stable within a 15-minute bucket of a local day and
 * distinct across buckets and days. Quip variety keys off it, so the flavor
 * line changes over the day without flickering every minute.
 */
export function radarBucket(now: Date): number {
  const dateNum = now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + now.getDate()
  const bucket = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15)
  return dateNum * 100 + bucket
}

/** 31-polynomial string hash reduced modulo `modulo` (0 when modulo <= 0). */
export function stableIndex(key: string, modulo: number): number {
  if (modulo <= 0) return 0
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % modulo
}

/** Deterministically picks one element by hashing `key`; null when empty. */
export function pickOne<T>(arr: readonly T[], key: string): T | null {
  if (arr.length === 0) return null
  // Safe: stableIndex returns 0..length-1 for a non-empty array.
  return arr[stableIndex(key, arr.length)] as T
}

/**
 * The quip a signal opens with in a given bucket: hashed from the signal id and
 * the bucket so every signal starts on a different line and the line moves on
 * every 15 minutes. The UI advances from here on its own rotation timer.
 */
export function quipStart(signalId: string, bucket: number, count: number): number {
  return stableIndex(`${signalId}|${bucket}`, count)
}
