import type { Course, Homework, ScheduleSlot, Semester } from '@/domain/model'
import { collectExams as collectExamNodes } from '@/domain/examMode'
import { daysBetween, daysUntil, hhmmToMinutes, parseYmd } from '@/lib/dates'
import { EXAM_WINDOW_DAYS, HOMEWORK_WINDOW_DAYS } from './constants'
import type { RadarStats } from './types'

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

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
 * Normalised start/end minutes of a slot on its own day: an end before the
 * start wraps past midnight. A zero-length slot (start === end, which the
 * editor rejects but an importer can produce) is not a class at all — treating
 * it as overnight would pin a 24-hour "LIVE" headline — so it yields null.
 */
function slotSpan(slot: ScheduleSlot): { startMin: number; endMin: number } | null {
  const startMin = hhmmToMinutes(slot.start)
  const rawEnd = hhmmToMinutes(slot.end)
  if (rawEnd === startMin) return null
  return { startMin, endMin: rawEnd < startMin ? rawEnd + DAY_MINUTES : rawEnd }
}

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
      const span = slotSpan(slot)
      if (!span) continue
      const { startMin, endMin } = span
      const overnight = endMin > DAY_MINUTES

      if (slot.day === nowDay) {
        if (!current && startMin <= nowMin && nowMin < endMin) {
          current = { course, slot, startMin, endMin }
        }
        if (startMin > nowMin && (!next || startMin < next.startMin)) {
          next = { course, slot, startMin, endMin }
        }
      } else if (overnight && slot.day === yesterdayDay && !current) {
        // The post-midnight tail of an overnight slot that began yesterday
        // (e.g. a Sun 23:00–01:00 class is still live at Mon 00:30).
        const tailEnd = endMin - DAY_MINUTES
        if (nowMin < tailEnd) {
          current = { course, slot, startMin: startMin - DAY_MINUTES, endMin: tailEnd }
        }
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
      const span = slotSpan(slot)
      if (!span) continue
      count++
      if (!first || span.startMin < first.startMin) first = { course, slot, ...span }
    }
  }
  return { first, count }
}

/** Whether any course has a (non-empty) slot on the given weekday. */
export function hasClassOn(semester: Semester, day: number): boolean {
  return semester.courses.some((course) =>
    course.schedule.some((slot) => slot.day === day && slotSpan(slot) !== null),
  )
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

/** Every incomplete homework without a due date, in course/list order. */
export function listHomeworkWithoutDueDate(
  semester: Semester,
): Array<{ course: Course; hw: Homework }> {
  const out: Array<{ course: Course; hw: Homework }> = []
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      if (!hw.completed && !hw.dueDate) out.push({ course, hw })
    }
  }
  return out
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

/** Every course with an unwatched backlog, biggest first (stable on ties). */
export function listRecordingsBacklogs(
  semester: Semester,
): Array<{ course: Course; backlog: number }> {
  const out: Array<{ course: Course; backlog: number }> = []
  for (const course of semester.courses) {
    const backlog = unwatchedCount(course)
    if (backlog > 0) out.push({ course, backlog })
  }
  return out.sort((a, b) => b.backlog - a.backlog)
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
