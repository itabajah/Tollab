import type { Semester } from '@/domain/model'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** What clicking a ticker item should open. */
export interface TickerTarget {
  type: 'course' | 'homework' | 'recordings' | 'exam' | 'none'
  courseId?: string
  homeworkId?: string
  /** For `exam` targets: which moed to deep-link to (highlight the field). */
  moed?: 'A' | 'B'
}

export interface TickerItem {
  /** Stable identity for de-dupe and the recently-shown window. */
  id: string
  /** Template category, e.g. 'class_now' / 'hw_overdue'. */
  category: string
  /** Higher shows more often; >= 7 counts as urgent (suppresses vibes). */
  priority: number
  /** Short label rendered before the message, e.g. 'NOW' / 'HW!!'. */
  badge: string
  /** Fully rendered message (no leftover placeholders). */
  text: string
  target: TickerTarget
}

export interface TickerContext {
  /** The selected semester (null when none is selected). */
  semester: Semester | null
  /** The current time; the ONLY source of time/randomness for the build. */
  now: Date
  /**
   * Whether any semester exists at all. Reserved for the UI (setup flows);
   * the built items do not depend on it.
   */
  hasAnySemester: boolean
}

export interface TickerPick {
  /** PRNG seed; pass `tickerSeed(now)` (plus a rotation counter if desired). */
  seed: number
  /** Recently shown item ids, avoided while other candidates remain. */
  recentIds: readonly string[]
}
