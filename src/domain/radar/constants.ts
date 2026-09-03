// ---------------------------------------------------------------------------
// Radar tuning constants
// ---------------------------------------------------------------------------

/** How often the card rotates its quip (live mode) or headline (calm mode). */
export const RADAR_ROTATE_MS = 12_000

/** "Starts within this many minutes" boundary between class_soon and class_next. */
export const CLASS_SOON_MINUTES = 15

/** Tomorrow's first class is previewed from this hour on (once today is done). */
export const CLASS_TOMORROW_FROM_HOUR = 16

/** Homework further out than this many days stays off the radar. */
export const HOMEWORK_WINDOW_DAYS = 7

/** Exams further out than this many days stay off the radar. */
export const EXAM_WINDOW_DAYS = 14

/** Incomplete homework count that triggers the pile nudge. */
export const HOMEWORK_PILE_THRESHOLD = 6

/** Unwatched recordings count that upgrades a backlog to recordings_big. */
export const RECORDINGS_BIG_THRESHOLD = 10

/** A gap before the next class shorter than this is not worth calling "free time". */
export const FREE_TIME_MIN_MINUTES = 45

/** How many "up next" signals the card surfaces as chips. */
export const RADAR_CHIP_LIMIT = 3

/**
 * Base scores per kind. Higher ranks first; a few kinds subtract a small,
 * bounded amount for distance in time so "sooner" always wins within a kind
 * and the tiers never cross (see `scoreFor`).
 */
export const SCORE = {
  class_now: 100,
  exam_today: 98,
  class_soon: 96,
  hw_overdue: 92,
  exam_tomorrow: 90,
  hw_today: 88,
  exam_soon: 84,
  hw_tomorrow: 80,
  class_next: 70,
  exam: 60,
  hw_soon: 58,
  recordings_big: 40,
  hw_many: 36,
  recordings_backlog: 30,
  hw_nodate: 26,
  class_tomorrow: 24,
  no_schedule: 20,
} as const

/** Setup nudges that replace everything else (no semester / no courses). */
export const SETUP_SCORE = 100
