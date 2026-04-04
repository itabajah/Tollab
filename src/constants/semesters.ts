/**
 * Semester season constants and helpers.
 */

/** Available semester season values. */
export const SEMESTER_SEASONS = Object.freeze([
  'Winter',
  'Spring',
  'Summer',
] as const);

/** Semester season type derived from the constant array. */
export type SemesterSeason = (typeof SEMESTER_SEASONS)[number];

/** Hebrew-to-English semester name translations. */
export const SEMESTER_TRANSLATIONS: Readonly<Record<string, SemesterSeason>> =
  Object.freeze({
    אביב: 'Spring',
    חורף: 'Winter',
    קיץ: 'Summer',
  });
