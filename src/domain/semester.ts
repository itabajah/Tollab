import { semesterSchema, type Semester } from './model'

/**
 * Semester naming follows the Technion academic year:
 * Winter spans two calendar years ("Winter 2024-2025"); Spring and Summer sit
 * in a single year. Sorting is newest-first by year, then by season within the
 * academic year (Winter > Summer > Spring). Hebrew names are recognized too.
 */

export function extractYear(name: string): number {
  const match = /\d{4}/.exec(name)
  return match ? Number(match[0]) : 0
}

export function seasonValue(name: string): number {
  const lower = name.toLowerCase()
  if (lower.includes('spring') || lower.includes('אביב')) return 1
  if (lower.includes('summer') || lower.includes('קיץ')) return 2
  if (lower.includes('winter') || lower.includes('חורף')) return 3
  return 0
}

export function compareSemesters(a: { name: string }, b: { name: string }): number {
  const yearA = extractYear(a.name)
  const yearB = extractYear(b.name)
  if (yearA !== yearB) return yearB - yearA
  return seasonValue(b.name) - seasonValue(a.name)
}

export function sortSemesters<T extends { name: string }>(semesters: readonly T[]): T[] {
  return [...semesters].sort(compareSemesters)
}

export type Season = 'Winter' | 'Spring' | 'Summer'

export function semesterName(season: Season, year: number): string {
  return season === 'Winter' ? `Winter ${year}-${year + 1}` : `${season} ${year}`
}

/** The generated choices for the "new semester" picker: 3 seasons × 3 years. */
export function generateSemesterOptions(now: Date): string[] {
  const currentYear = now.getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]
  const seasons: Season[] = ['Winter', 'Spring', 'Summer']
  return years.flatMap((year) => seasons.map((season) => semesterName(season, year)))
}

export function createSemester(name: string, id: string): Semester {
  return semesterSchema.parse({ id, name })
}

/** Chronological order of the seasons within one Technion academic year. */
export const SEASON_ORDER: readonly Season[] = ['Winter', 'Spring', 'Summer']

export interface SemesterRef {
  season: Season
  year: number
}

/** Monotonic ordinal (year-major, season chronological) for range comparison. */
export function semesterOrdinal(ref: SemesterRef): number {
  return ref.year * 3 + SEASON_ORDER.indexOf(ref.season)
}

/**
 * The inclusive list of semesters from `start` to `end` in chronological order,
 * or `[]` when `start` is after `end`. Used to drive a multi-semester import.
 */
export function buildSemesterRange(start: SemesterRef, end: SemesterRef): SemesterRef[] {
  const endOrd = semesterOrdinal(end)
  const out: SemesterRef[] = []
  for (let ord = semesterOrdinal(start); ord <= endOrd; ord++) {
    out.push({ season: SEASON_ORDER[ord % 3]!, year: Math.floor(ord / 3) })
  }
  return out
}
