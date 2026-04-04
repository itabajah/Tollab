/**
 * Homework types for the Tollab academic management app.
 */

/** A labeled hyperlink attached to a homework assignment. */
export interface HomeworkLink {
  /** Display label for the link. */
  label: string;
  /** URL of the link. */
  url: string;
}

/** A homework assignment entry within a course. */
export interface Homework {
  /** Homework title. */
  title: string;
  /** Due date in YYYY-MM-DD format, or empty string if unset. */
  dueDate: string;
  /** Whether the homework has been completed. */
  completed: boolean;
  /** Free-form notes. */
  notes: string;
  /** Attached links (e.g. submission page, resources). */
  links: HomeworkLink[];
}
