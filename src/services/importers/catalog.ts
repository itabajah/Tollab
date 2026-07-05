/**
 * Technion SAP course catalog (michael-maltsev/technion-sap-info-fetcher
 * gh-pages JSON) parsing, course matching and enrichment — port of the legacy
 * import-export.js fetchTechnionData helpers.
 */

import type { Course } from '@/domain/model'
import { convertDdMmYyyy } from '@/lib/dates'

export const TECHNION_SAP_BASE_URL =
  'https://raw.githubusercontent.com/michael-maltsev/technion-sap-info-fetcher/gh-pages/'

export interface CatalogEntry {
  number: string
  name: string
  points: string
  lecturer: string
  faculty: string
  syllabus: string
  moedA: string
  moedB: string
}

const KEY_NUMBER = 'מספר מקצוע'
const KEY_NAME = 'שם מקצוע'
const KEY_POINTS = 'נקודות'
const KEY_LECTURER = 'אחראים'
const KEY_FACULTY = 'פקולטה'
const KEY_SYLLABUS = 'סילבוס'
const KEY_MOED_A = 'מועד א'
const KEY_MOED_B = 'מועד ב'

function fieldText(general: Record<string, unknown>, key: string): string {
  const value = general[key]
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

/**
 * Pulls the first `dd-MM-yyyy` token out of an exam value and converts it to
 * ymd. SAP values often carry extra text around the date ("13-07-2026 09:00",
 * "בתאריך 13-07-2026 יום ב'"); anything without a date yields ''.
 */
function examDateToYmd(value: string): string {
  const match = /(?<!\d)(\d{2}[-./]\d{2}[-./]\d{4})(?!\d)/.exec(value)
  if (!match?.[1]) return ''
  return convertDdMmYyyy(match[1]) ?? ''
}

/** SAP items nest the Hebrew fields under `general`; flat items are accepted too. */
function generalOf(item: unknown): Record<string, unknown> | null {
  if (typeof item !== 'object' || item === null) return null
  const record = item as Record<string, unknown>
  const general = record.general
  if (typeof general === 'object' && general !== null && !Array.isArray(general)) {
    return general as Record<string, unknown>
  }
  if (KEY_NUMBER in record) return record
  return null
}

/**
 * Parses the SAP courses JSON array into a catalog keyed by digit-stripped
 * course number. Items without a course number are skipped; exam dates are
 * converted to ymd.
 */
export function parseCatalog(raw: unknown): Map<string, CatalogEntry> {
  const catalog = new Map<string, CatalogEntry>()
  if (!Array.isArray(raw)) return catalog

  for (const item of raw) {
    const general = generalOf(item)
    if (!general) continue

    const number = fieldText(general, KEY_NUMBER)
    const key = number.replace(/\D/g, '')
    if (!key) continue

    catalog.set(key, {
      number,
      name: fieldText(general, KEY_NAME),
      points: fieldText(general, KEY_POINTS),
      lecturer: fieldText(general, KEY_LECTURER),
      faculty: fieldText(general, KEY_FACULTY),
      syllabus: fieldText(general, KEY_SYLLABUS),
      moedA: examDateToYmd(fieldText(general, KEY_MOED_A)),
      moedB: examDateToYmd(fieldText(general, KEY_MOED_B)),
    })
  }

  return catalog
}

/**
 * Finds the catalog entry for a local course. Strategies, in order:
 * digits-normalized exact key match; leading-zero-stripped key equality;
 * suffix/contains key match (numbers of 5+ digits only, mirroring legacy);
 * finally a case-insensitive "catalog name contains local name" fallback.
 */
export function matchCatalogEntry(
  catalog: Map<string, CatalogEntry>,
  course: { number: string; name: string },
): CatalogEntry | null {
  const localNum = course.number.replace(/\D/g, '')

  if (localNum) {
    const exact = catalog.get(localNum)
    if (exact) return exact

    const stripped = localNum.replace(/^0+/, '')
    if (stripped) {
      for (const [key, entry] of catalog) {
        if (key.replace(/^0+/, '') === stripped) return entry
      }
    }

    if (localNum.length >= 5) {
      for (const [key, entry] of catalog) {
        if (key.endsWith(localNum) || key.includes(localNum)) return entry
      }
    }
  }

  const localName = course.name.toLowerCase().trim()
  if (localName) {
    for (const entry of catalog.values()) {
      if (entry.name.toLowerCase().includes(localName)) return entry
    }
  }

  return null
}

/**
 * Returns a new course with empty fields (number, points, lecturer, faculty,
 * syllabus, exam dates) filled from the catalog entry. Non-empty course
 * fields are never overwritten and the input course is not mutated; when
 * nothing actually changes the original `course` reference is returned so
 * callers can detect a no-op by identity.
 */
export function enrichCourse(course: Course, entry: CatalogEntry): Course {
  const number = course.number || entry.number
  const points = course.points || entry.points
  const lecturer = course.lecturer || entry.lecturer
  const faculty = course.faculty || entry.faculty
  const syllabus = course.syllabus || entry.syllabus
  const moedA = course.exams.moedA || entry.moedA
  const moedB = course.exams.moedB || entry.moedB

  const changed =
    number !== course.number ||
    points !== course.points ||
    lecturer !== course.lecturer ||
    faculty !== course.faculty ||
    syllabus !== course.syllabus ||
    moedA !== course.exams.moedA ||
    moedB !== course.exams.moedB

  if (!changed) return course

  return { ...course, number, points, lecturer, faculty, syllabus, exams: { moedA, moedB } }
}

export interface CatalogSemesterRef {
  year: number
  semester: number
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  return null
}

/** Parses last_semesters.json ([{year, semester}, ...]); malformed entries are skipped. */
export function parseLastSemesters(raw: unknown): CatalogSemesterRef[] {
  if (!Array.isArray(raw)) return []
  const refs: CatalogSemesterRef[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const record = item as Record<string, unknown>
    const year = toFiniteNumber(record.year)
    const semester = toFiniteNumber(record.semester)
    if (year !== null && semester !== null) refs.push({ year, semester })
  }
  return refs
}

/** URLs of the SAP data files, mirroring the legacy construction. */
export function catalogUrls(
  baseUrl: string,
  year: number,
  semesterCode: number,
): { lastSemesters: string; courses: string } {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return {
    lastSemesters: `${base}last_semesters.json`,
    courses: `${base}courses_${year}_${semesterCode}.json`,
  }
}
