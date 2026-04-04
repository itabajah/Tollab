/**
 * Header ticker types for the Tollab academic management app.
 *
 * The ticker displays context-aware, playful reminders about classes,
 * homework, exams, and recordings in a rotating header bar.
 */

/**
 * All possible ticker message categories.
 * Each category maps to a template array in HEADER_TICKER_TEMPLATES.
 */
export type TickerCategory =
  | 'no_semester'
  | 'no_courses'
  | 'no_schedule'
  | 'no_classes_today'
  | 'all_clear'
  | 'late_night'
  | 'morning'
  | 'weekend'
  | 'class_now'
  | 'class_soon'
  | 'class_next'
  | 'class_tomorrow'
  | 'hw_nodate'
  | 'hw_many'
  | 'hw_all_done'
  | 'hw_overdue'
  | 'hw_today'
  | 'hw_tomorrow'
  | 'hw_soon'
  | 'exam'
  | 'exam_today'
  | 'exam_tomorrow'
  | 'exam_soon'
  | 'recordings_backlog'
  | 'recordings_big'
  | 'recordings_clear'
  | 'general'
  | 'general_course_roast';

/** Semantic kind of a ticker item (used for priority grouping). */
export type TickerKind =
  | 'info'
  | 'class'
  | 'homework'
  | 'exam'
  | 'recordings';

/**
 * Template variable values injected into ticker message templates.
 * Placeholders like `{title}` are replaced with values from this record.
 */
export type TickerTemplateVars = Record<string, string | number>;

/**
 * A single ticker item produced by `buildHeaderTickerItems()`.
 * The ticker rotates through an array of these, prioritized by urgency.
 */
export interface TickerContext {
  /** Stable dedup key (e.g. "hw_overdue:calc1", "class_now"). */
  key: string;
  /** Semantic kind for priority grouping. */
  kind: TickerKind;
  /** Short badge text (e.g. "SETUP", "FREE", "HW", "EXAM"). */
  badge: string;
  /** Category key into HEADER_TICKER_TEMPLATES. */
  templateCategory: TickerCategory;
  /** Variables to interpolate into the chosen template string. */
  templateVars: TickerTemplateVars;
  /** Display priority (higher = shown more often). */
  priority: number;
  /** Optional pre-rendered text (bypasses template lookup). */
  text?: string;
}

/**
 * The full template map: category → array of template strings.
 * Template strings contain `{placeholder}` tokens.
 */
export type TickerTemplateMap = Record<TickerCategory, readonly string[]>;
