/**
 * Profile types for the Tollab academic management app.
 */

/** A user profile entry (stored in the profiles list). */
export interface Profile {
  /** Unique profile identifier. */
  id: string;
  /** Display name of the profile. */
  name: string;
}

/**
 * Complete data payload for a single profile.
 * This is the top-level application data structure.
 */
export interface ProfileData {
  /** All semesters belonging to this profile. */
  semesters: import('./semester').Semester[];
  /** Application display settings. */
  settings: import('./settings').AppSettings;
  /** ISO 8601 timestamp of last modification. */
  lastModified: string;
}
