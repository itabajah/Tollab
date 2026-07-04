/**
 * Cheesefork ICS calendar parsing (port of the legacy import-export.js
 * parseICS). VEVENT blocks become either exam dates (Hebrew "מועד א" /
 * "מועד ב" summaries, applied to matching courses in a second pass) or weekly
 * schedule entries aggregated per course name.
 */

import { parseIcsDate } from '@/lib/dates'

export interface ImportedSchedule {
  day: number
  start: string
  end: string
}

export interface ImportedCourse {
  name: string
  number: string
  lecturers: string[]
  locations: string[]
  schedule: ImportedSchedule[]
  exams: { moedA: string; moedB: string }
}

/** Translates Hebrew season names to English; anything else passes through. */
export function translateSemesterName(name: string): string {
  return name.replace('אביב', 'Spring').replace('חורף', 'Winter').replace('קיץ', 'Summer')
}

/**
 * Splits ICS text into logical (unfolded) lines: physical lines are separated
 * by CRLF/LF/CR and a line starting with a space or tab continues the previous
 * one — the single leading whitespace char is dropped (RFC 5545 folding).
 */
export function unfoldIcsLines(text: string): string[] {
  const lines: string[] = []
  let current: string | null = null
  for (const raw of text.split(/\r\n|\n|\r/)) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && current !== null) {
      current += raw.slice(1)
    } else {
      if (current !== null) lines.push(current)
      current = raw
    }
  }
  if (current !== null) lines.push(current)
  return lines
}

/** Unescapes RFC 5545 TEXT values: `\n`, `\N`, `\,`, `\;`, `\\`. */
function unescapeIcsText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, ch: string) => (ch === 'n' || ch === 'N' ? '\n' : ch))
}

interface IcsEvent {
  summary: string
  description: string
  location: string
  dtstart: string
  dtend: string
}

function collectEvents(lines: string[]): { events: IcsEvent[]; calendarName: string } {
  const events: IcsEvent[] = []
  let calendarName = ''
  let current: IcsEvent | null = null

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    // Property parameters (";TZID=..." etc.) are irrelevant here.
    const key = line.slice(0, colonIdx).split(';')[0] ?? ''
    const value = line.slice(colonIdx + 1).trim()

    if (key === 'BEGIN' && value === 'VEVENT') {
      current = { summary: '', description: '', location: '', dtstart: '', dtend: '' }
    } else if (key === 'END' && value === 'VEVENT') {
      if (current) events.push(current)
      current = null
    } else if (current) {
      if (key === 'SUMMARY') current.summary = unescapeIcsText(value)
      else if (key === 'DESCRIPTION') current.description = unescapeIcsText(value)
      else if (key === 'LOCATION') current.location = unescapeIcsText(value)
      else if (key === 'DTSTART') current.dtstart = value
      else if (key === 'DTEND') current.dtend = value
    } else if (key === 'X-WR-CALNAME') {
      calendarName = unescapeIcsText(value)
    }
  }

  return { events, calendarName }
}

type MoedKey = 'moedA' | 'moedB'

interface ExamDate {
  courseName: string
  moed: MoedKey
  date: string
}

// Optional geresh (ASCII apostrophe or U+05F3) and optional dash before the
// course name, e.g. "מבחן מועד א׳ - אלגוריתמים 1".
const MOED_A_RE = /מועד א['׳]?\s*[-–]?\s*(.+)/
const MOED_B_RE = /מועד ב['׳]?\s*[-–]?\s*(.+)/

function parseExamEvent(event: IcsEvent): ExamDate | null {
  const matchA = MOED_A_RE.exec(event.summary)
  const matchB = matchA ? null : MOED_B_RE.exec(event.summary)
  const courseName = (matchA ?? matchB)?.[1]?.trim() ?? ''
  if (!courseName) return null

  const dateMatch = /^(\d{4})(\d{2})(\d{2})/.exec(event.dtstart)
  if (!dateMatch) return null

  return {
    courseName,
    moed: matchA ? 'moedA' : 'moedB',
    date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
  }
}

interface CourseAccumulator {
  name: string
  lecturers: Set<string>
  locations: Set<string>
  schedule: ImportedSchedule[]
  moedA: string
  moedB: string
}

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function isDuplicateSlot(schedule: readonly ImportedSchedule[], slot: ImportedSchedule): boolean {
  return schedule.some((s) => s.day === slot.day && s.start === slot.start && s.end === slot.end)
}

function processScheduleEvent(courseMap: Map<string, CourseAccumulator>, event: IcsEvent): void {
  // "הרצאה - אלגוריתמים 1" → everything after the first " - " is the name.
  // The summary is already trimmed and non-empty, so the name never ends up
  // empty: a trimmed string cannot end with " - ".
  const separatorIdx = event.summary.indexOf(' - ')
  const name = (separatorIdx !== -1 ? event.summary.slice(separatorIdx + 3) : event.summary).trim()

  let course = courseMap.get(name)
  if (!course) {
    course = {
      name,
      lecturers: new Set(),
      locations: new Set(),
      schedule: [],
      moedA: '',
      moedB: '',
    }
    courseMap.set(name, course)
  }

  if (event.description) course.lecturers.add(event.description)
  if (event.location) course.locations.add(event.location)

  const start = parseIcsDate(event.dtstart)
  const end = parseIcsDate(event.dtend)
  if (!start || !end) return

  const slot: ImportedSchedule = { day: start.getDay(), start: hhmm(start), end: hhmm(end) }
  if (!isDuplicateSlot(course.schedule, slot)) course.schedule.push(slot)
}

/** Second pass: exact course-name match first, then partial in either direction. */
function applyExamDates(courseMap: Map<string, CourseAccumulator>, exams: ExamDate[]): void {
  for (const exam of exams) {
    let course = courseMap.get(exam.courseName)
    if (!course) {
      for (const [name, candidate] of courseMap) {
        if (name.includes(exam.courseName) || exam.courseName.includes(name)) {
          course = candidate
          break
        }
      }
    }
    if (course) course[exam.moed] = exam.date
  }
}

// A Hebrew season name followed by a year ("אביב 2026", "חורף 2025-2026").
const SEASON_YEAR_RE = /(אביב|חורף|קיץ)\s*(\d{4}(?:\s*[-–/]\s*\d{4})?)/

function findSemesterHint(texts: readonly string[]): string | null {
  for (const text of texts) {
    const match = SEASON_YEAR_RE.exec(text)
    const season = match?.[1]
    const year = match?.[2]
    if (season && year) return translateSemesterName(`${season} ${year.replace(/\s+/g, '')}`)
  }
  return null
}

/**
 * Parses ICS text into imported courses plus a semester-name hint.
 *
 * Events with a Hebrew moed summary become exam dates (no DTEND required);
 * every other event needs SUMMARY, DTSTART and DTEND and contributes a weekly
 * schedule slot (identical day+start+end deduplicated), lecturer
 * (DESCRIPTION) and location per course name. The hint is the translated
 * "Season Year" found in the calendar name or an event summary, else null.
 */
export function parseIcs(text: string): { courses: ImportedCourse[]; semesterHint: string | null } {
  const { events, calendarName } = collectEvents(unfoldIcsLines(text))

  const courseMap = new Map<string, CourseAccumulator>()
  const examDates: ExamDate[] = []

  for (const event of events) {
    if (!event.summary || !event.dtstart) continue

    const exam = parseExamEvent(event)
    if (exam) {
      examDates.push(exam)
      continue
    }

    if (!event.dtend) continue
    processScheduleEvent(courseMap, event)
  }

  applyExamDates(courseMap, examDates)

  const courses: ImportedCourse[] = [...courseMap.values()].map((c) => ({
    name: c.name,
    number: '',
    lecturers: [...c.lecturers],
    locations: [...c.locations],
    schedule: c.schedule,
    exams: { moedA: c.moedA, moedB: c.moedB },
  }))

  const semesterHint = findSemesterHint([calendarName, ...events.map((e) => e.summary)])
  return { courses, semesterHint }
}
