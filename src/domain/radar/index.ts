import type { Course } from '@/domain/model'
import { formatYmd } from '@/lib/dates'
import {
  CLASS_SOON_MINUTES,
  CLASS_TOMORROW_FROM_HOUR,
  FREE_TIME_MIN_MINUTES,
  HOMEWORK_PILE_THRESHOLD,
  RECORDINGS_BIG_THRESHOLD,
  SCORE,
  SETUP_SCORE,
} from './constants'
import {
  collectHomework,
  collectUpcomingExams,
  countOpenHomework,
  findCurrentAndNextClass,
  findHomeworkWithoutDueDate,
  findRecordingsBacklog,
  findTomorrowClasses,
  hasClassOn,
  pickHomework,
  semesterStats,
  unwatchedCount,
  type ClassHit,
  type ExamCandidate,
  type HomeworkCandidate,
} from './collectors'
import {
  dueMeta,
  examMeta,
  formatClock,
  formatDuration,
  formatPace,
  formatWeekdayDate,
} from './format'
import { pickOne } from './hash'
import { renderQuips } from './quips'
import type {
  MetaPart,
  RadarContext,
  RadarKind,
  RadarSignal,
  RadarSnapshot,
  RadarStats,
  RadarTone,
} from './types'

/**
 * Radar domain logic: the "what matters right now" card at the top of the app.
 *
 * `buildRadar(ctx)` turns the selected semester + the current time into two
 * queues, fully deterministically (all time comes from `ctx.now`; the only
 * "randomness" is a stable hash):
 *
 * - `live`: ranked signals that deserve attention — the running/next class,
 *   urgent homework, the nearest exam, a recordings backlog, setup nudges. The
 *   UI pins the top one, offers the rest as chips, and lets the user act (mark
 *   done, snooze, open) in place. Snoozed ids are filtered out here.
 * - `calm`: what to say when nothing is live — time-of-day vibes, a free day,
 *   the all-clear with progress stats, a course roast, a study tip. The UI
 *   rotates through these; rotation is reserved for moments where nothing is
 *   at stake, so the important item is never hidden behind a random pick.
 *
 * Facts (title / meta) and flavor (quips) are separate so the card can state
 * the fact plainly and keep the personality on its own line.
 */

export { RADAR_ROTATE_MS, RADAR_CHIP_LIMIT } from './constants'
export { RADAR_QUIPS, renderQuips } from './quips'
export { radarBucket, quipStart } from './hash'
export { formatDuration, formatPace } from './format'
export type {
  MetaPart,
  RadarContext,
  RadarKind,
  RadarSignal,
  RadarSnapshot,
  RadarStats,
  RadarTarget,
  RadarTone,
} from './types'

// ---------------------------------------------------------------------------
// Signal construction helpers
// ---------------------------------------------------------------------------

type Vars = Record<string, string>

interface Draft {
  id: string
  kind: RadarKind
  mode: 'live' | 'calm'
  tone: RadarTone
  badge: string
  score: number
  title: string
  titleIsUser: boolean
  meta: MetaPart[]
  brief: string
  vars?: Vars
  target: RadarSignal['target']
  courseColor?: string
  homework?: { courseId: string; homeworkId: string }
  snoozable: boolean
  progress?: number
}

function finalize(draft: Draft, common: Vars): RadarSignal {
  const { vars, ...rest } = draft
  return { ...rest, quips: renderQuips(draft.kind, { ...common, ...vars }) }
}

const user = (text: string): MetaPart => ({ text, user: true })
const plain = (text: string): MetaPart => ({ text })

function setupSignal(kind: 'no_semester' | 'no_courses' | 'no_schedule', title: string): Draft {
  return {
    id: kind,
    kind,
    mode: 'live',
    tone: 'setup',
    badge: 'SETUP',
    score: kind === 'no_schedule' ? SCORE.no_schedule : SETUP_SCORE,
    title,
    titleIsUser: false,
    meta: kind === 'no_schedule' ? [plain('add class times in a course')] : [],
    brief: '',
    target: { type: 'none' },
    snoozable: kind === 'no_schedule',
  }
}

function calmSignal(
  kind: RadarKind,
  badge: string,
  title: string,
  meta: MetaPart[] = [],
  vars?: Vars,
): Draft {
  return {
    id: kind,
    kind,
    mode: 'calm',
    tone: kind === 'all_clear' ? 'calm' : 'info',
    badge,
    score: 0,
    title,
    titleIsUser: false,
    meta,
    brief: '',
    ...(vars ? { vars } : {}),
    target: { type: 'none' },
    snoozable: false,
  }
}

function classSignal(hit: ClassHit, kind: RadarKind, nowMin: number, vars: Vars): Draft {
  const { course, slot } = hit
  const range = `${slot.start}–${slot.end}`
  const meta: MetaPart[] = course.location ? [user(course.location)] : []
  let tone: RadarTone = 'info'
  let badge = 'NEXT'
  let score: number = SCORE.class_next
  let progress: number | undefined
  let brief: string
  if (kind === 'class_now') {
    tone = 'live'
    badge = 'LIVE'
    score = SCORE.class_now
    brief = `ends in ${formatDuration(hit.endMin - nowMin)}`
    meta.push(plain(range), { text: brief, tone: 'warn' })
    progress = Math.min(1, Math.max(0, (nowMin - hit.startMin) / (hit.endMin - hit.startMin)))
  } else if (kind === 'class_soon') {
    tone = 'live'
    badge = 'SOON'
    score = SCORE.class_soon
    brief = `starts in ${formatDuration(hit.startMin - nowMin)}`
    meta.push({ text: brief, tone: 'warn' }, plain(range))
  } else {
    // class_next: sooner ranks higher; the penalty is capped so even a class
    // many hours away still outranks backlogs and setup nudges.
    const minutes = hit.startMin - nowMin
    score = SCORE.class_next - Math.min(16, Math.floor(minutes / 30))
    brief = `at ${slot.start}`
    meta.push(plain(brief), plain(`in ${formatDuration(minutes)}`))
  }
  return {
    id: `${kind}:${course.id}:${slot.day}:${slot.start}`,
    kind,
    mode: 'live',
    tone,
    badge,
    score,
    title: course.name,
    titleIsUser: true,
    meta,
    brief,
    vars: { ...vars, start: slot.start, end: slot.end },
    target: { type: 'course', courseId: course.id },
    courseColor: course.color,
    snoozable: true,
    ...(progress !== undefined ? { progress } : {}),
  }
}

function tomorrowSignal(first: ClassHit, count: number): Draft {
  const { course, slot } = first
  const brief = `tomorrow at ${slot.start}`
  const meta: MetaPart[] = [plain(brief)]
  if (course.location) meta.push(user(course.location))
  if (count > 1) meta.push(plain(`${count} classes tomorrow`))
  return {
    id: `class_tomorrow:${course.id}:${slot.day}:${slot.start}`,
    kind: 'class_tomorrow',
    mode: 'live',
    tone: 'info',
    badge: 'TOMORROW',
    score: SCORE.class_tomorrow,
    title: course.name,
    titleIsUser: true,
    meta,
    brief,
    vars: { start: slot.start, count: String(count) },
    target: { type: 'course', courseId: course.id },
    courseColor: course.color,
    snoozable: true,
  }
}

function homeworkSignal(candidate: HomeworkCandidate, free: string): Draft {
  const { course, hw, diff } = candidate
  const kind: RadarKind =
    diff < 0 ? 'hw_overdue' : diff === 0 ? 'hw_today' : diff === 1 ? 'hw_tomorrow' : 'hw_soon'
  const tone: RadarTone = diff < 0 ? 'critical' : diff <= 1 ? 'warn' : 'info'
  const badge = diff < 0 ? 'HW!!' : diff <= 1 ? 'HW!' : 'HW'
  const score = kind === 'hw_soon' ? SCORE.hw_soon - 2 * diff : SCORE[kind]
  const due = dueMeta(diff)
  return {
    id: `hw:${course.id}:${hw.id}`,
    kind,
    mode: 'live',
    tone,
    badge,
    score,
    title: hw.title,
    titleIsUser: true,
    meta: [user(course.name), due],
    brief: due.text,
    vars: { days: String(Math.abs(diff)), free },
    target: { type: 'homework', courseId: course.id, homeworkId: hw.id },
    courseColor: course.color,
    homework: { courseId: course.id, homeworkId: hw.id },
    snoozable: true,
  }
}

function examSignal(exam: ExamCandidate): Draft {
  const { course, moed, date, diff } = exam
  const kind: RadarKind =
    diff === 0 ? 'exam_today' : diff === 1 ? 'exam_tomorrow' : diff <= 3 ? 'exam_soon' : 'exam'
  const tone: RadarTone = diff === 0 ? 'critical' : diff <= 3 ? 'warn' : 'info'
  const badge = diff === 0 ? 'EXAM!!' : diff <= 3 ? 'EXAM!' : 'EXAM'
  const score = kind === 'exam' ? SCORE.exam - (diff - 4) : SCORE[kind]
  const countdown = examMeta(diff)
  const meta: MetaPart[] = [plain(`Moed ${moed}`), plain(formatWeekdayDate(date)), countdown]
  // Pacing insight: spread the course's unwatched recordings over the days left.
  const unwatched = unwatchedCount(course)
  const pace = formatPace(unwatched, diff)
  if (unwatched > 0) meta.push(plain(`${unwatched} unwatched`))
  if (pace && diff > 0) meta.push(plain(pace))
  return {
    id: `exam:${course.id}:${moed}`,
    kind,
    mode: 'live',
    tone,
    badge,
    score,
    title: course.name,
    titleIsUser: true,
    meta,
    brief: `Moed ${moed} ${countdown.text}`,
    vars: { days: String(diff), examType: moed, date: formatWeekdayDate(date) },
    target: { type: 'exam', courseId: course.id, moed },
    courseColor: course.color,
    snoozable: true,
  }
}

function recordingsSignal(course: Course, backlog: number): Draft {
  const big = backlog >= RECORDINGS_BIG_THRESHOLD
  return {
    id: `recordings:${course.id}`,
    kind: big ? 'recordings_big' : 'recordings_backlog',
    mode: 'live',
    tone: 'info',
    badge: big ? 'REC!' : 'REC',
    score: big ? SCORE.recordings_big : SCORE.recordings_backlog,
    title: course.name,
    titleIsUser: true,
    meta: [plain(`${backlog} unwatched`)],
    brief: `${backlog} unwatched`,
    vars: { count: String(backlog) },
    target: { type: 'recordings', courseId: course.id },
    courseColor: course.color,
    snoozable: true,
  }
}

function statsMeta(stats: RadarStats, snoozedCount: number): MetaPart[] {
  const parts: MetaPart[] = []
  if (stats.homework.total > 0) {
    parts.push(plain(`${stats.homework.done}/${stats.homework.total} homework done`))
  }
  if (stats.recordings.total > 0) {
    parts.push(plain(`${stats.recordings.watched}/${stats.recordings.total} recordings watched`))
  }
  if (stats.exams.total > 0) {
    parts.push(plain(`${stats.exams.passed}/${stats.exams.total} exams passed`))
  }
  if (parts.length === 0) parts.push(plain('nothing pending'))
  if (snoozedCount > 0) parts.push(plain(`${snoozedCount} snoozed`))
  return parts
}

// ---------------------------------------------------------------------------
// buildRadar
// ---------------------------------------------------------------------------

function empty(draft: Draft, calm: Draft[], common: Vars): RadarSnapshot {
  return {
    live: [finalize(draft, common)],
    calm: calm.map((c) => finalize(c, common)),
    stats: null,
    snoozedCount: 0,
  }
}

/**
 * Builds the radar for a context. Deterministic: the same semester + time
 * always yields the same snapshot. Live signals are sorted by score
 * (descending, stable), calm signals come in rotation order.
 */
export function buildRadar(ctx: RadarContext): RadarSnapshot {
  const { semester, now } = ctx
  const hour = now.getHours()
  const late = hour >= 23 || hour < 5
  const common: Vars = { time: formatClock(now), late: late ? '1' : '' }
  const tip = calmSignal('tip', 'NOTE', 'Study tip')

  // Setup nudges: these replace everything else.
  if (!semester) return empty(setupSignal('no_semester', 'Start with a semester'), [tip], common)
  if (semester.courses.length === 0) {
    return empty(setupSignal('no_courses', 'No courses yet'), [tip], common)
  }

  const nowDay = now.getDay()
  const nowMin = hour * 60 + now.getMinutes()
  const snoozed = new Set(ctx.snoozedIds ?? [])
  const live: Draft[] = []

  // 1) Classes: the one running now, the next one today, tomorrow's preview.
  const { current, next } = findCurrentAndNextClass(semester, nowDay, nowMin)
  const hasSchedule = semester.courses.some((course) => course.schedule.length > 0)
  const hwCandidates = collectHomework(semester, now)
  // "Free for X" — the gap until the next class, when it's long enough to use.
  const gap = next && !current ? next.startMin - nowMin : 0
  const free = gap >= FREE_TIME_MIN_MINUTES ? formatDuration(gap) : ''

  if (current) live.push(classSignal(current, 'class_now', nowMin, {}))
  if (next) {
    const kind = next.startMin - nowMin <= CLASS_SOON_MINUTES ? 'class_soon' : 'class_next'
    // The free-time quip only makes sense when there is homework to spend it on.
    live.push(classSignal(next, kind, nowMin, { free: hwCandidates.length > 0 ? free : '' }))
  }
  if (!current && !next && hour >= CLASS_TOMORROW_FROM_HOUR) {
    const tomorrow = findTomorrowClasses(semester, nowDay)
    if (tomorrow.first) live.push(tomorrowSignal(tomorrow.first, tomorrow.count))
  }
  if (!hasSchedule) live.push(setupSignal('no_schedule', 'No class times yet'))

  // 2) Homework: up to two urgent items, a pile nudge, an undated nudge.
  for (const candidate of pickHomework(hwCandidates)) live.push(homeworkSignal(candidate, free))
  const open = countOpenHomework(semester)
  if (open.open >= HOMEWORK_PILE_THRESHOLD) {
    live.push({
      id: 'hw_many',
      kind: 'hw_many',
      mode: 'live',
      tone: 'info',
      badge: 'HW+',
      score: SCORE.hw_many,
      title: `${open.open} open assignments`,
      titleIsUser: false,
      meta: open.courses > 1 ? [plain(`across ${open.courses} courses`)] : [],
      brief: '',
      vars: { count: String(open.open), countMinusOne: String(open.open - 1) },
      target: { type: 'none' },
      snoozable: true,
    })
  }
  const undated = findHomeworkWithoutDueDate(semester)
  if (undated) {
    live.push({
      id: `hw_nodate:${undated.course.id}:${undated.hw.id}`,
      kind: 'hw_nodate',
      mode: 'live',
      tone: 'info',
      badge: 'HW',
      score: SCORE.hw_nodate,
      title: undated.hw.title,
      titleIsUser: true,
      meta: [user(undated.course.name), plain('no due date')],
      brief: 'no due date',
      target: { type: 'homework', courseId: undated.course.id, homeworkId: undated.hw.id },
      courseColor: undated.course.color,
      homework: { courseId: undated.course.id, homeworkId: undated.hw.id },
      snoozable: true,
    })
  }

  // 3) The nearest exam (an exam today is always the nearest).
  const exam = collectUpcomingExams(semester, now)[0]
  if (exam) live.push(examSignal(exam))

  // 4) The biggest recordings backlog.
  const backlog = findRecordingsBacklog(semester)
  if (backlog) live.push(recordingsSignal(backlog.course, backlog.backlog))

  // Rank: score descending; the insertion order above breaks ties (it is
  // already most-urgent-first within each collector).
  const ranked = live
    .map((draft, index) => ({ draft, index }))
    .sort((a, b) => b.draft.score - a.draft.score || a.index - b.index)
    .map(({ draft }) => draft)
  const visible = ranked.filter((draft) => !snoozed.has(draft.id))
  const snoozedCount = ranked.length - visible.length

  // 5) Calm rotation: only shown when nothing live remains.
  const calm: Draft[] = []
  const weekend = nowDay === 6 || (nowDay === 5 && hour >= 13)
  if (late) calm.push(calmSignal('late_night', 'ZZZ', `It's ${common.time}`))
  else if (weekend) calm.push(calmSignal('weekend', 'WEEKEND', 'Weekend mode'))
  else if (hour >= 5 && hour < 10) calm.push(calmSignal('morning', 'AM', 'Good morning'))

  const classToday = hasClassOn(semester, nowDay)
  if (hasSchedule && !classToday && !late) {
    calm.push(calmSignal('no_classes_today', 'FREE', 'No classes today'))
  }
  if (classToday && !current && !next && !late) {
    calm.push(calmSignal('done_today', 'DONE', 'Classes done for today'))
  }

  const stats = semesterStats(semester, now)
  calm.push(
    calmSignal(
      'all_clear',
      'OK',
      snoozedCount > 0 ? 'Quiet for now' : 'All clear',
      statsMeta(stats, snoozedCount),
    ),
  )

  const roasted = pickOne(semester.courses, `roast|${formatYmd(now)}`)
  if (roasted) {
    calm.push({
      id: `roast:${roasted.id}`,
      kind: 'roast',
      mode: 'calm',
      tone: 'info',
      badge: 'VIBE',
      score: 0,
      title: roasted.name,
      titleIsUser: true,
      meta: [],
      brief: '',
      target: { type: 'course', courseId: roasted.id },
      courseColor: roasted.color,
      snoozable: false,
    })
  }
  calm.push(tip)

  return {
    live: visible.map((draft) => finalize(draft, common)),
    calm: calm.map((draft) => finalize(draft, common)),
    stats,
    snoozedCount,
  }
}
