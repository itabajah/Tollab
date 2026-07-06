// ---------------------------------------------------------------------------
// Header ticker tuning constants
// ---------------------------------------------------------------------------

/** Rotation interval of the header ticker, in milliseconds. */
export const HEADER_TICKER_ROTATE_MS = 9000

/** How many recently shown item ids the UI should remember (and avoid). */
export const TICKER_RECENT_WINDOW = 5

/** Legacy cap on the per-item weight in the priority-weighted pick pool. */
export const PRIORITY_WEIGHT_CAP = 3

/** Homework further out than this many days stays out of the ticker. */
export const HOMEWORK_WINDOW_DAYS = 7

/** Exams further out than this many days stay out of the ticker. */
export const EXAM_WINDOW_DAYS = 14

/** Incomplete homework count that triggers the hw_many pile nudge. */
export const HOMEWORK_PILE_THRESHOLD = 6

/** Unwatched recordings count that upgrades the backlog to recordings_big. */
export const RECORDINGS_BIG_THRESHOLD = 10

/** "Starts within this many minutes" boundary between class_soon and class_next. */
export const CLASS_SOON_MINUTES = 15

/** Items at or above this priority suppress time-of-day vibes. */
export const URGENT_PRIORITY = 7

/** Fewer items than this after the real collectors → add daily fillers. */
export const FILLER_THRESHOLD = 3
