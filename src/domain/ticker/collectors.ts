import type { Course, Homework, ScheduleSlot, Semester } from '@/domain/model'
import { daysBetween, formatShortDate, parseYmd } from '@/lib/dates'
import { EXAM_WINDOW_DAYS, HOMEWORK_WINDOW_DAYS, RECORDINGS_BIG_THRESHOLD } from './constants'
import type { TickerCategory } from './templates'
import { courseTag, pickOne, type RawItem } from './render'

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------

function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
}

interface ClassHit {
  course: Course
  slot: ScheduleSlot
  startMin: number
}

/**
 * The class in session right now (start <= now < end, overnight slots wrap
 * past midnight) and the next class later TODAY (strictly after now).
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

      if (slot.day === nowDay) {
        let endMin = rawEnd
        if (endMin <= startMin) endMin += 24 * 60 // overnight slot
        if (!current && startMin <= nowMin && nowMin < endMin) {
          current = { course, slot, startMin }
        }
        if (startMin > nowMin && (!next || startMin < next.startMin)) {
          next = { course, slot, startMin }
        }
      } else if (rawEnd < startMin && slot.day === yesterdayDay && nowMin < rawEnd) {
        // The post-midnight tail of an overnight slot that began yesterday
        // (e.g. a Sun 23:00–01:00 class is still live at Mon 00:30).
        if (!current) current = { course, slot, startMin }
      }
    }
  }

  return { current, next }
}

/** The earliest class scheduled on tomorrow's weekday, if any. */
export function findTomorrowFirstClass(semester: Semester, nowDay: number): ClassHit | null {
  const tomorrowDay = (nowDay + 1) % 7
  let best: ClassHit | null = null
  for (const course of semester.courses) {
    for (const slot of course.schedule) {
      if (slot.day !== tomorrowDay) continue
      const startMin = toMinutes(slot.start)
      if (!best || startMin < best.startMin) best = { course, slot, startMin }
    }
  }
  return best
}

type HomeworkBucket = 'hw_overdue' | 'hw_today' | 'hw_tomorrow' | 'hw_soon'

interface HomeworkCandidate {
  course: Course
  hw: Homework
  /** Calendar days until due (negative = overdue). */
  diff: number
  category: HomeworkBucket
  badge: string
}

/** All incomplete, dated homework due within the ticker window. */
export function collectHomeworkCandidates(semester: Semester, now: Date): HomeworkCandidate[] {
  const out: HomeworkCandidate[] = []
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      if (hw.completed || !hw.dueDate) continue
      const due = parseYmd(hw.dueDate)
      if (!due) continue
      const diff = daysBetween(now, due)
      if (diff > HOMEWORK_WINDOW_DAYS) continue
      const category: HomeworkBucket =
        diff < 0 ? 'hw_overdue' : diff === 0 ? 'hw_today' : diff === 1 ? 'hw_tomorrow' : 'hw_soon'
      const badge = diff < 0 ? 'HW!!' : diff <= 1 ? 'HW!' : 'HW'
      out.push({ course, hw, diff, category, badge })
    }
  }
  return out
}

function homeworkItem(candidate: HomeworkCandidate, priority: number): RawItem {
  const { course, hw } = candidate
  return {
    id: `hw:${course.id}:${hw.id}:${hw.dueDate}`,
    category: candidate.category,
    badge: candidate.badge,
    priority,
    vars: {
      title: hw.title,
      course: course.name,
      courseMaybe: courseTag(course.name),
      days: String(Math.abs(candidate.diff)),
    },
    target: { type: 'homework', courseId: course.id, homeworkId: hw.id },
  }
}

/**
 * Picks up to two urgent homeworks (legacy behavior): the first from the
 * most urgent non-empty bucket, the second preferring a different course
 * and chosen through urgency-weighted buckets. Both picks are seeded.
 */
export function pickUrgentHomework(
  candidates: readonly HomeworkCandidate[],
  salt: string,
): RawItem[] {
  const byBucket = (bucket: HomeworkBucket, pool: readonly HomeworkCandidate[]) =>
    pool.filter((c) => c.category === bucket)

  const firstPool =
    [
      byBucket('hw_overdue', candidates),
      byBucket('hw_today', candidates),
      byBucket('hw_tomorrow', candidates),
      byBucket('hw_soon', candidates),
    ].find((pool) => pool.length > 0) ?? []
  const first = pickOne(firstPool, `${salt}|hw|first`)
  if (!first) return []

  const remaining = candidates.filter((c) => c !== first)
  const differentCourse = remaining.filter((c) => c.course.id !== first.course.id)
  const pool = differentCourse.length > 0 ? differentCourse : remaining

  // Urgency-weighted bucket choice for the second pick (legacy weights).
  const weightedBuckets: HomeworkCandidate[][] = []
  const pushBucket = (bucket: HomeworkCandidate[], weight: number) => {
    if (bucket.length === 0) return
    for (let i = 0; i < weight; i++) weightedBuckets.push(bucket)
  }
  pushBucket(byBucket('hw_overdue', pool), 5)
  pushBucket(byBucket('hw_today', pool), 4)
  pushBucket(byBucket('hw_tomorrow', pool), 3)
  pushBucket(byBucket('hw_soon', pool), 2)

  const bucket = pickOne(weightedBuckets, `${salt}|hw|secondBucket`)
  const second = bucket ? pickOne(bucket, `${salt}|hw|second`) : null

  const items = [homeworkItem(first, 8)]
  if (second) items.push(homeworkItem(second, 7))
  return items
}

/** The first incomplete homework without a due date, as a nudge item. */
export function findHomeworkWithoutDueDate(semester: Semester): RawItem | null {
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      if (hw.completed || hw.dueDate) continue
      return {
        id: `hw_nodate:${course.id}:${hw.id}`,
        category: 'hw_nodate',
        badge: 'HW',
        priority: 3,
        vars: { title: hw.title, course: course.name, courseMaybe: courseTag(course.name) },
        target: { type: 'homework', courseId: course.id, homeworkId: hw.id },
      }
    }
  }
  return null
}

interface ExamCandidate {
  course: Course
  moed: 'A' | 'B'
  date: string
  parsed: Date
  /** Calendar days until the exam (0 = today). */
  diff: number
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Upcoming Moed A/B exams within the window, sorted soonest first. */
export function collectExamCandidates(semester: Semester, now: Date): ExamCandidate[] {
  const out: ExamCandidate[] = []
  for (const course of semester.courses) {
    const moeds: Array<['A' | 'B', string]> = [
      ['A', course.exams.moedA],
      ['B', course.exams.moedB],
    ]
    for (const [moed, date] of moeds) {
      if (!date) continue
      const parsed = parseYmd(date)
      if (!parsed) continue
      const diff = daysBetween(now, parsed)
      if (diff < 0 || diff > EXAM_WINDOW_DAYS) continue
      out.push({ course, moed, date, parsed, diff })
    }
  }
  out.sort((a, b) => a.diff - b.diff)
  return out
}

/**
 * The single exam item: an exam happening today always wins; otherwise a
 * seeded pick among the next few upcoming exams (legacy window of 4) so the
 * ticker doesn't always spam the closest one.
 */
export function pickExamItem(candidates: readonly ExamCandidate[], salt: string): RawItem | null {
  const chosen =
    candidates.find((c) => c.diff === 0) ?? pickOne(candidates.slice(0, 4), `${salt}|exam|pick`)
  if (!chosen) return null

  const { course, diff } = chosen
  const category: TickerCategory =
    diff === 0 ? 'exam_today' : diff === 1 ? 'exam_tomorrow' : diff <= 3 ? 'exam_soon' : 'exam'
  const badge = diff === 0 ? 'EXAM!!' : diff <= 3 ? 'EXAM!' : 'EXAM'
  const prettyDate = `${WEEKDAY_SHORT[chosen.parsed.getDay()] ?? ''}, ${formatShortDate(chosen.date)}`

  return {
    id: `exam:${course.id}:${chosen.moed}:${chosen.date}`,
    category,
    badge,
    priority: 9,
    vars: {
      course: course.name,
      courseMaybe: courseTag(course.name),
      examType: chosen.moed,
      days: String(diff),
      date: prettyDate,
    },
    target: { type: 'exam', courseId: course.id, moed: chosen.moed },
  }
}

/** The course with the biggest unwatched-recordings backlog, if any. */
export function findRecordingsBacklog(semester: Semester): RawItem | null {
  let best: { course: Course; backlog: number } | null = null
  for (const course of semester.courses) {
    let backlog = 0
    for (const tab of course.recordings.tabs) {
      backlog += tab.items.filter((item) => !item.watched).length
    }
    if (backlog > 0 && (!best || backlog > best.backlog)) best = { course, backlog }
  }
  if (!best) return null

  const big = best.backlog >= RECORDINGS_BIG_THRESHOLD
  return {
    id: `recordings:${best.course.id}:${best.backlog}`,
    category: big ? 'recordings_big' : 'recordings_backlog',
    badge: big ? 'REC!' : 'REC',
    priority: 4,
    vars: {
      course: best.course.name,
      courseMaybe: courseTag(best.course.name),
      count: String(best.backlog),
    },
    target: { type: 'recordings', courseId: best.course.id },
  }
}
