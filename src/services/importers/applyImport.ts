/**
 * Applies parsed Cheesefork/ICS courses to AppData — port of the legacy
 * import-export.js processImportedData. Pure: returns a new AppData plus a
 * report of what was created or updated; the input is never mutated.
 */

import {
  courseSchema,
  type AppData,
  type Course,
  type Semester,
  type Settings,
} from '@/domain/model'
import { newId } from '@/domain/ids'
import { nextCourseColor } from '@/domain/colors'
import { createSemester } from '@/domain/semester'
import { translateSemesterName, type ImportedCourse, type ImportedSchedule } from './ics'

export interface ImportReport {
  createdSemester: boolean
  createdCourses: string[]
  updatedCourses: string[]
}

/** "234247 - אלגוריתמים 1" → number "234247", name "אלגוריתמים 1". */
const NUMBER_PREFIX_RE = /^(\d{6,8})\s*[-–]\s*(.+)/

/** Mirrors legacy findExistingCourse: number match first, then name substring. */
function findExistingCourse(
  courses: readonly Course[],
  imported: ImportedCourse,
): Course | undefined {
  if (imported.number) {
    const byNumber = courses.find(
      (c) => c.name.includes(imported.number) || c.number === imported.number,
    )
    if (byNumber) return byNumber
  }
  if (!imported.name) return undefined
  return courses.find((c) => c.name.includes(imported.name) || c.name === imported.name)
}

function isDuplicateSlot(
  schedule: readonly { day: number; start: string; end: string }[],
  slot: ImportedSchedule,
): boolean {
  return schedule.some((s) => s.day === slot.day && s.start === slot.start && s.end === slot.end)
}

/**
 * Fills empty exam dates and appends missing schedule slots. Returns the
 * merged copy, or null when nothing changed.
 */
function mergeImportedCourse(course: Course, imported: ImportedCourse): Course | null {
  let changed = false

  const exams = { ...course.exams }
  if (!exams.moedA && imported.exams.moedA) {
    exams.moedA = imported.exams.moedA
    changed = true
  }
  if (!exams.moedB && imported.exams.moedB) {
    exams.moedB = imported.exams.moedB
    changed = true
  }

  const schedule = [...course.schedule]
  for (const slot of imported.schedule) {
    if (!isDuplicateSlot(schedule, slot)) {
      schedule.push({ ...slot })
      changed = true
    }
  }

  return changed ? { ...course, exams, schedule } : null
}

function createImportedCourse(
  imported: ImportedCourse,
  existingCount: number,
  settings: Settings,
): Course {
  let number = imported.number
  let name = imported.name

  if (!number) {
    const parts = NUMBER_PREFIX_RE.exec(name)
    if (parts?.[1] && parts[2]) {
      number = parts[1]
      name = parts[2]
    }
  }

  return courseSchema.parse({
    id: newId(),
    name,
    color: nextCourseColor(existingCount, settings),
    number,
    lecturer: imported.lecturers.join(', '),
    location: imported.locations.join(', '),
    schedule: imported.schedule,
    exams: imported.exams,
  })
}

/**
 * Imports courses into the semester named `semesterName` (Hebrew season names
 * are translated first, matching legacy; lookup is case-insensitive and the
 * semester is created when missing). Existing courses — matched by number or
 * name substring — get empty exam dates filled and missing schedule slots
 * added; the rest are created with the next palette color and schema
 * defaults. `lastModified` is set to `nowIso`.
 */
export function applyImportedCourses(
  data: AppData,
  semesterName: string,
  imported: ImportedCourse[],
  nowIso: string,
): { data: AppData; report: ImportReport } {
  const targetName = translateSemesterName(semesterName)
  const existing = data.semesters.find((s) => s.name.toLowerCase() === targetName.toLowerCase())
  const semester = existing ?? createSemester(targetName, newId())

  const courses = [...semester.courses]
  const createdCourses: string[] = []
  const updatedCourses: string[] = []

  for (const importedCourse of imported) {
    const match = findExistingCourse(courses, importedCourse)
    if (match) {
      const merged = mergeImportedCourse(match, importedCourse)
      if (merged) {
        courses[courses.indexOf(match)] = merged
        updatedCourses.push(merged.name)
      }
    } else {
      const course = createImportedCourse(importedCourse, courses.length, data.settings)
      courses.push(course)
      createdCourses.push(course.name)
    }
  }

  const nextSemester: Semester = { ...semester, courses }
  const semesters = existing
    ? data.semesters.map((s) => (s.id === existing.id ? nextSemester : s))
    : [...data.semesters, nextSemester]

  return {
    data: { ...data, semesters, lastModified: nowIso },
    report: { createdSemester: !existing, createdCourses, updatedCourses },
  }
}
