import type { Semester } from '@/domain/model'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Every kind of signal the radar can raise. */
export type RadarKind =
  // Live — ranked, pinned, actionable
  | 'class_now'
  | 'class_soon'
  | 'class_next'
  | 'class_tomorrow'
  | 'hw_overdue'
  | 'hw_today'
  | 'hw_tomorrow'
  | 'hw_soon'
  | 'hw_nodate'
  | 'hw_many'
  | 'exam_today'
  | 'exam_tomorrow'
  | 'exam_soon'
  | 'exam'
  | 'recordings_backlog'
  | 'recordings_big'
  | 'no_semester'
  | 'no_courses'
  | 'no_schedule'
  // Calm — rotate only when nothing live remains
  | 'late_night'
  | 'weekend'
  | 'morning'
  | 'no_classes_today'
  | 'done_today'
  | 'all_clear'
  | 'roast'
  | 'tip'

/**
 * Visual accent of a signal. Monochrome by default; the three status tones map
 * onto the app's fixed status tokens (error / warning / success).
 */
export type RadarTone = 'live' | 'critical' | 'warn' | 'info' | 'calm' | 'setup'

/** What opening a signal should show. */
export interface RadarTarget {
  type: 'course' | 'homework' | 'recordings' | 'exam' | 'none'
  courseId?: string
  homeworkId?: string
  /** For `exam` targets: which moed to deep-link to (highlight the field). */
  moed?: 'A' | 'B'
}

/**
 * One fragment of the fact line under the title. `user` marks text that came
 * from the user's data (course names, titles, locations — usually Hebrew) so
 * the UI can isolate it for bidi; `tone` tints the fragment (e.g. "due today").
 */
export interface MetaPart {
  text: string
  user?: boolean
  tone?: 'critical' | 'warn' | 'calm'
}

export interface RadarSignal {
  /** Stable identity: used for snoozing, pinning and keyed transitions. */
  id: string
  kind: RadarKind
  /** Live signals are ranked and pinned; calm ones only rotate when nothing live remains. */
  mode: 'live' | 'calm'
  tone: RadarTone
  /** Short label rendered before the title, e.g. 'NOW' / 'HW!' / 'EXAM'. */
  badge: string
  /** Rank within the live queue (higher first). Calm signals carry 0. */
  score: number
  /** The subject: a course name, an assignment title, or an app phrase. */
  title: string
  /** True when `title` is user data (rendered bidi-isolated). */
  titleIsUser: boolean
  /** Facts, in order, joined by separators in the UI. */
  meta: MetaPart[]
  /** The single most useful fact for compact contexts (the "up next" chips); '' when none. */
  brief: string
  /** Rendered flavor lines (no leftover placeholders); the UI rotates through them. */
  quips: string[]
  target: RadarTarget
  /** Course hue for the leading dot, when the signal belongs to one course. */
  courseColor?: string
  /** Present on homework signals so the UI can offer "Done" in place. */
  homework?: { courseId: string; homeworkId: string }
  /** Whether the user may hide this signal until tomorrow. */
  snoozable: boolean
  /** 0..1 elapsed fraction of the running class (class_now only). */
  progress?: number
}

export interface RadarContext {
  /** The selected semester (null when none is selected). */
  semester: Semester | null
  /** The current time; the ONLY source of time/randomness for the build. */
  now: Date
  /** Signal ids the user snoozed for today; dropped from the live queue. */
  snoozedIds?: readonly string[]
}

export interface RadarStats {
  homework: { done: number; total: number }
  recordings: { watched: number; total: number }
  exams: { passed: number; total: number }
}

export interface RadarSnapshot {
  /** Ranked, snooze-filtered live signals (may be empty). */
  live: RadarSignal[]
  /** Calm signals in rotation order; never empty (a tip is always available). */
  calm: RadarSignal[]
  /** Semester progress counters, or null without a usable semester. */
  stats: RadarStats | null
  /** How many live signals were hidden by a snooze. */
  snoozedCount: number
}
