/**
 * Semester comparison utilities — sorting by year and season.
 */

/**
 * Extracts the four-digit year from a semester name string.
 * Returns `0` when no year is found.
 */
export function extractYear(semesterName: string): number {
  const match = semesterName.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Returns a numeric priority for the season portion of a semester name.
 * Supports English and Hebrew names.
 *
 * - 1 = Spring / אביב
 * - 2 = Summer / קיץ
 * - 3 = Winter / חורף
 * - 0 = unknown
 */
export function getSeasonValue(season: string): number {
  const lower = season.toLowerCase();
  if (lower.includes('spring') || lower.includes('אביב')) return 1;
  if (lower.includes('summer') || lower.includes('קיץ')) return 2;
  if (lower.includes('winter') || lower.includes('חורף')) return 3;
  return 0;
}

/**
 * Comparison function for sorting semesters newest-first.
 *
 * Sort order: year descending, then season priority descending
 * (Winter > Summer > Spring).
 */
export function compareSemesters(a: string, b: string): number {
  const yearA = extractYear(a);
  const yearB = extractYear(b);

  if (yearA !== yearB) {
    return yearB - yearA;
  }

  return getSeasonValue(b) - getSeasonValue(a);
}
