import { formatYmd } from '@/lib/dates'
import {
  CLASS_SOON_MINUTES,
  FILLER_THRESHOLD,
  HOMEWORK_PILE_THRESHOLD,
  PRIORITY_WEIGHT_CAP,
  URGENT_PRIORITY,
} from './constants'
import {
  courseTag,
  finalize,
  infoItem,
  mulberry32,
  pickOne,
  tickerSeed,
  type RawItem,
} from './render'
import {
  collectExamCandidates,
  collectHomeworkCandidates,
  findCurrentAndNextClass,
  findHomeworkWithoutDueDate,
  findRecordingsBacklog,
  findTomorrowFirstClass,
  pickExamItem,
  pickUrgentHomework,
} from './collectors'
import type { TickerContext, TickerItem, TickerPick } from './types'

/**
 * Header ticker domain logic: the playful reminder strip at the top of the
 * app. Ported from the legacy header-ticker.js with the full template
 * catalog verbatim (Hebrew flourishes included), but rebuilt as pure
 * functions:
 *
 * - `buildTickerItems(ctx)` is fully deterministic for a given context — all
 *   randomness is derived from `ctx.now` (15-minute buckets), never from
 *   `Date.now()` / `Math.random()`.
 * - `pickTickerItem(items, { seed, recentIds })` replaces the legacy
 *   stateful rotation: a seeded PRNG picks from a priority-weighted pool
 *   (weight capped at 3, like the legacy order builder) while avoiding
 *   recently shown ids until the pool would empty.
 *
 * The catalog, seeding/render helpers, and per-domain collectors live in the
 * sibling modules (`templates`, `render`, `collectors`, `constants`, `types`).
 */

// Re-export the public surface so `@/domain/ticker` stays a single entry point.
export { HEADER_TICKER_ROTATE_MS, TICKER_RECENT_WINDOW } from './constants'
export { TICKER_TEMPLATES } from './templates'
export { tickerSeed } from './render'
export type { TickerContext, TickerItem, TickerPick, TickerTarget } from './types'

// ---------------------------------------------------------------------------
// buildTickerItems
// ---------------------------------------------------------------------------

/**
 * Builds every ticker item that applies to the given context, sorted by
 * priority (descending, stable) with unique ids. Fully deterministic: the
 * same context always yields the same items and texts, and texts stay
 * stable within a 15-minute bucket.
 */
export function buildTickerItems(ctx: TickerContext): TickerItem[] {
  const { semester, now } = ctx
  const salt = String(tickerSeed(now))

  // Setup nudges: these replace everything else.
  if (!semester) return [finalize(infoItem('no_semester', 'SETUP', 1), salt)]
  if (semester.courses.length === 0) return [finalize(infoItem('no_courses', 'SETUP', 1), salt)]

  const nowDay = now.getDay()
  const hour = now.getHours()
  const nowMin = hour * 60 + now.getMinutes()
  const ymd = formatYmd(now)
  const items: RawItem[] = []

  // 1) Classes: current + next today (highest priority).
  const { current, next } = findCurrentAndNextClass(semester, nowDay, nowMin)
  if (current) {
    items.push({
      id: `class_now:${current.course.id}:${current.slot.day}:${current.slot.start}`,
      category: 'class_now',
      badge: 'NOW',
      priority: 10,
      vars: {
        course: current.course.name,
        courseMaybe: courseTag(current.course.name),
        start: current.slot.start,
        end: current.slot.end,
      },
      target: { type: 'course', courseId: current.course.id },
    })
  }
  if (next) {
    const minutes = next.startMin - nowMin
    items.push({
      id: `class_next:${next.course.id}:${next.slot.day}:${next.slot.start}`,
      category: minutes <= CLASS_SOON_MINUTES ? 'class_soon' : 'class_next',
      badge: 'NEXT',
      priority: 9,
      vars: {
        course: next.course.name,
        courseMaybe: courseTag(next.course.name),
        start: next.slot.start,
        end: next.slot.end,
        minutes: String(minutes),
      },
      target: { type: 'course', courseId: next.course.id },
    })
  }

  // 1.5) Tomorrow's first class — only when nothing is left today.
  if (!current && !next) {
    const tomorrow = findTomorrowFirstClass(semester, nowDay)
    if (tomorrow) {
      items.push({
        id: `class_tomorrow:${tomorrow.course.id}:${tomorrow.slot.day}:${tomorrow.slot.start}`,
        category: 'class_tomorrow',
        badge: 'SOON',
        priority: 4,
        vars: {
          course: tomorrow.course.name,
          courseMaybe: courseTag(tomorrow.course.name),
          start: tomorrow.slot.start,
        },
        target: { type: 'course', courseId: tomorrow.course.id },
      })
    }
  }

  // 1.75) No schedule at all → setup nudge (and skip "no classes today").
  const hasSchedule = semester.courses.some((course) => course.schedule.length > 0)
  if (!hasSchedule) items.push(infoItem('no_schedule', 'SETUP', 2))

  // 2) Homework: up to two urgent incomplete items with a due date.
  const hwCandidates = collectHomeworkCandidates(semester, now)
  const hwItems = pickUrgentHomework(hwCandidates, salt)
  items.push(...hwItems)

  // 2.5) Homework volume nudge when there is a pile.
  let hwTotal = 0
  let hwIncomplete = 0
  for (const course of semester.courses) {
    for (const hw of course.homework) {
      hwTotal++
      if (!hw.completed) hwIncomplete++
    }
  }
  const hwMany = hwIncomplete >= HOMEWORK_PILE_THRESHOLD
  if (hwMany) {
    items.push({
      id: `hw_many:${hwIncomplete}`,
      category: 'hw_many',
      badge: 'HW+',
      priority: 5,
      vars: { count: String(hwIncomplete), countMinusOne: String(hwIncomplete - 1) },
      target: { type: 'none' },
    })
  }

  // 3) Exams: the single most relevant upcoming exam.
  const examItem = pickExamItem(collectExamCandidates(semester, now), salt)
  if (examItem) items.push(examItem)

  // 4) Homework without a due date (nudge to set one).
  const noDateHw = findHomeworkWithoutDueDate(semester)
  if (noDateHw) items.push(noDateHw)

  // 5) Recordings backlog (course with the biggest backlog).
  const recordingsBacklog = findRecordingsBacklog(semester)
  if (recordingsBacklog) items.push(recordingsBacklog)

  // 5.5) Positive states — only when nothing actionable is on.
  let recTotal = 0
  let recUnwatched = 0
  for (const course of semester.courses) {
    for (const tab of course.recordings.tabs) {
      for (const item of tab.items) {
        recTotal++
        if (!item.watched) recUnwatched++
      }
    }
  }
  const hasUrgentHw = hwItems.length > 0 || noDateHw !== null || hwMany
  const hasActionable =
    current !== null ||
    next !== null ||
    hasUrgentHw ||
    examItem !== null ||
    recordingsBacklog !== null
  if (!hasActionable) {
    if (hwTotal > 0 && hwIncomplete === 0) items.push(infoItem('hw_all_done', 'NICE', 2))
    if (recTotal > 0 && recUnwatched === 0) items.push(infoItem('recordings_clear', 'NICE', 2))
    items.push(infoItem('all_clear', 'OK', 2))
  }

  // 6) Free day: schedule exists but nothing today (not useful late at night).
  const hasClassToday = semester.courses.some((course) =>
    course.schedule.some((slot) => slot.day === nowDay),
  )
  const isLateNightWindow = hour >= 23 || hour < 6
  if (hasSchedule && !current && !next && !hasClassToday && !isLateNightWindow) {
    items.push(infoItem('no_classes_today', 'FREE', 3))
  }

  // 7) Time-of-day vibes — only when nothing urgent is showing.
  const hasUrgent = items.some((item) => item.priority >= URGENT_PRIORITY)
  if (!hasUrgent) {
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const time = `${String(hour).padStart(2, '0')}:${minutes}`
    if (hour >= 23 || hour <= 4) {
      items.push({ ...infoItem('late_night', 'ZZZ', 3), id: `late_night:${hour}`, vars: { time } })
    } else if (nowDay === 6 || (nowDay === 5 && hour >= 17) || (nowDay === 0 && hour < 18)) {
      items.push({ ...infoItem('weekend', 'WEEKEND', 2), id: `weekend:${nowDay}` })
    } else if (hour >= 5 && hour < 10) {
      items.push({ ...infoItem('morning', 'AM', 1), id: `morning:${hour}` })
    }
  }

  // 8) Daily fillers when the list is thin: course roast + general note.
  if (items.length < FILLER_THRESHOLD) {
    const roastCourse = pickOne(semester.courses, `roast|${ymd}`)
    if (roastCourse) {
      items.push({
        id: `general_course_roast:${roastCourse.id}:${ymd}`,
        category: 'general_course_roast',
        badge: 'VIBE',
        priority: 1,
        vars: { course: roastCourse.name, courseMaybe: courseTag(roastCourse.name) },
        target: { type: 'none' },
      })
    }
    items.push({ ...infoItem('general', 'NOTE', 1), id: `general:${ymd}` })
  }

  // De-dupe by id (keep the first), sort by priority descending (stable).
  const seen = new Set<string>()
  const deduped = items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
  deduped.sort((a, b) => b.priority - a.priority)

  return deduped.map((item) => finalize(item, salt))
}

// ---------------------------------------------------------------------------
// pickTickerItem
// ---------------------------------------------------------------------------

/**
 * Picks the next item to display: seeded, priority-weighted (weight capped
 * at 3 like the legacy rotation order), and avoiding recently shown ids
 * unless every candidate is recent. Returns null for an empty list.
 */
export function pickTickerItem(items: readonly TickerItem[], pick: TickerPick): TickerItem | null {
  if (items.length === 0) return null

  const fresh = items.filter((item) => !pick.recentIds.includes(item.id))
  const pool = fresh.length > 0 ? fresh : items

  const weighted: TickerItem[] = []
  for (const item of pool) {
    const weight = Math.min(Math.max(1, Math.floor(item.priority)), PRIORITY_WEIGHT_CAP)
    for (let i = 0; i < weight; i++) weighted.push(item)
  }

  const roll = mulberry32(pick.seed)()
  // Safe: `pool` is non-empty, so `weighted` has at least one entry and
  // roll < 1 keeps the index in range.
  return weighted[Math.floor(roll * weighted.length)] as TickerItem
}
