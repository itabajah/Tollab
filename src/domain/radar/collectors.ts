import type { Course, Homework, ScheduleSlot, Semester } from '@/domain/model'
import { collectExams as collectExamNodes } from '@/domain/examMode'
import { daysBetween, daysUntil, parseYmd } from '@/lib/dates'
import { EXAM_WINDOW_DAYS, HOMEWORK_WINDOW_DAYS } from './constants'
import type { RadarStats } from './types'

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
}

export interface ClassHit {
  course: Course
  slot: ScheduleSlot
  /** Minutes since today's midnight; negative for the tail of an overnight class that began yesterday. */
  startMin: number
  /** Minutes since today's midnight; may exceed 24h for an overnight class that ends tomorrow. */
  endMin: number
}

const DAY_MINUTES = 24 * 60

/**
 * The class in session right now (start <= now < end, overnight slots wrap
 * past midnight) and the next class later TODAY (strictly after now, earliest
 * first). Both carry normalised start/end minutes so callers can compute
 * elapsed and remaining time directly.
 */
export function findCurrentAndNextClass(
  semester: Semester,
  nowDay: number,
  nowMin: number,
): { current: ClassHit | null; next: ClassHit | null } {
  let current: ClassHit | null = null
  let next: ClassHit | null = null
  const yesterdayDay = (nowDay + 6) % 7

  for (const course of semester.courses) {
    for (const slot of course.schedule) {
      const startMin = toMinutes(slot.start)
      const rawEnd = toMinutes(slot.end)
      const overnight = rawEnd <= startMin

      if (slot.day === nowDay) {
        const endMin = overnight ? rawEnd + DAY_MINUTES : rawEnd
        if (!current && startMin <= nowMin && nowMin < endMin) {
          current = { course, slot, startMin, endMin }
        }
        if (startMin > nowMin && (!next || startMin < next.startMin)) {
          next = { course, slot, startMin, endMin }
        }
      } else if (overnight && slot.day === yesterdayDay && nowMin < rawEnd && !current) {
        // The post-midnight tail of an overnight slot that began yesterday
        // (e.g. a Sun 23:00–01:00 class is still live at Mon 00:30).
        current = { course, slot, startMin: startMin - DAY_MINUTES, endMin: rawEnd }
      }
    }
  }

  return { current, next }
}

/** The earliest class scheduled on tomorrow's weekday plus how many there are. */
export function findTomorrowClasses(
  semester: Semester,
  nowDay: number,
): { first: ClassHit | null; count: number } {
  const tomorrowDay = (nowDay + 1) % 7
  let first: ClassHit | null = null
  let count = 0
  for (const course of semester.courses) {
    for (const slot of course.schedule) {
      if (slot.day !== tomorrowDay) continue
      count++
      const startMin = toMinutes(slot.start)
      if (!first || startMin < first.startMin) {
        const rawEnd = toMinutes(slot.end)
        first = {
          course,
          slot,
          startMin,
          endMin: rawEnd <= startMin ? rawEnd + DAY_MINUTES : rawEnd,
        }
      }
    }
  }
  return { first, count }
}

/** Whether any course has a slot on the given weekday. */
export function hasClassOn(semester: Semester, day: number): boolean {
  return semester.courses.some((course) => course.schedule.some((slot) => slot.day === day))
}

// ---------------------------------------------------------------------------
// Homework
// ---------------------------------------------------------------------------

export interface HomeworkCandidate {
  course: Course
  hw: Homework
  /** Calendar days until due (negative = overdue). */
  diff: number
}

/**
 * All incomplete, dated homework due within the window, most urgent first
 * (stable: ties keep course/list order).
 */
export function collectHomework(semester: Semester, now: Date): HomeworkCandidate[] {
  const out: HomeworkCandidate[] = []
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      if (hw.completed || !hw.dueDate) continue
      const due = parseYmd(hw.dueDate)
      if (!due) continue
      const diff = daysBetween(now, due)
      if (diff > HOMEWORK_WINDOW_DAYS) continue
      out.push({ course, hw, diff })
    }
  }
  return out.sort((a, b) => a.diff - b.diff)
}

/**
 * Up to two homework signals: the most urgent one, then the most urgent
 * remaining one from a DIFFERENT course when there is one (so a single course
 * can't monopolise the card), else the next most urgent overall.
 */
export function pickHomework(candidates: readonly HomeworkCandidate[]): HomeworkCandidate[] {
  const first = candidates[0]
  if (!first) return []
  const rest = candidates.slice(1)
  const second = rest.find((c) => c.course.id !== first.course.id) ?? rest[0]
  return second ? [first, second] : [first]
}

/** The first incomplete homework without a due date. */
export function findHomeworkWithoutDueDate(
  semester: Semester,
): { course: Course; hw: Homework } | null {
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      if (!hw.completed && !hw.dueDate) return { course, hw }
    }
  }
  return null
}

/** Incomplete homework count and how many courses it is spread across. */
export function countOpenHomework(semester: Semester): { open: number; courses: number } {
  let open = 0
  let courses = 0
  for (const course of semester.courses) {
    const here = course.homework.filter((hw) => !hw.completed).length
    if (here === 0) continue
    open += here
    courses++
  }
  return { open, courses }
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export interface ExamCandidate {
  course: Course
  moed: 'A' | 'B'
  date: string
  /** Calendar days until the exam (0 = today). */
  diff: number
}

/** Upcoming Moed A/B exams within the window, soonest first (A before B on a tie). */
export function collectUpcomingExams(semester: Semester, now: Date): ExamCandidate[] {
  const out: ExamCandidate[] = []
  for (const course of semester.courses) {
    const moeds: Array<['A' | 'B', string]> = [
      ['A', course.exams.moedA],
      ['B', course.exams.moedB],
    ]
    for (const [moed, date] of moeds) {
      const parsed = parseYmd(date)
      if (!parsed) continue
      const diff = daysBetween(now, parsed)
      if (diff < 0 || diff > EXAM_WINDOW_DAYS) continue
      out.push({ course, moed, date, diff })
    }
  }
  return out.sort((a, b) => a.diff - b.diff)
}

// ---------------------------------------------------------------------------
// Recordings
// ---------------------------------------------------------------------------

/** Unwatched recordings across every tab of a course. */
export function unwatchedCount(course: Course): number {
  let n = 0
  for (const tab of course.recordings.tabs) {
    n += tab.items.filter((item) => !item.watched).length
  }
  return n
}

/** The course with the biggest unwatched-recordings backlog, if any. */
export function findRecordingsBacklog(
  semester: Semester,
): { course: Course; backlog: number } | null {
  let best: { course: Course; backlog: number } | null = null
  for (const course of semester.courses) {
    const backlog = unwatchedCount(course)
    if (backlog > 0 && (!best || backlog > best.backlog)) best = { course, backlog }
  }
  return best
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/** Semester-wide progress counters (exams count every dated node, hidden ones included). */
export function semesterStats(semester: Semester, now: Date): RadarStats {
  let hwDone = 0
  let hwTotal = 0
  let watched = 0
  let recTotal = 0
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      hwTotal++
      if (hw.completed) hwDone++
    }
    for (const tab of course.recordings.tabs) {
      for (const item of tab.items) {
        recTotal++
        if (item.watched) watched++
      }
    }
  }
  const nodes = collectExamNodes(semester, { includeHidden: true })
  const passed = nodes.filter((node) => (daysUntil(node.date, now) ?? 0) < 0).length
  return {
    homework: { done: hwDone, total: hwTotal },
    recordings: { watched, total: recTotal },
    exams: { passed, total: nodes.length },
  }
}
