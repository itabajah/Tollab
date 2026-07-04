import type { Course, Homework, ScheduleSlot, Semester } from '@/domain/model'
import { daysBetween, formatShortDate, formatYmd, parseYmd } from '@/lib/dates'

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
 * Deliberate deviations from the legacy file (per the rebuild spec):
 * - No ±5 minute grace window around class start/end (live means
 *   start <= now < end).
 * - Badges: upcoming classes are always 'NEXT' (legacy flipped to 'SOON'
 *   within an hour), tomorrow's class is 'SOON' (legacy 'TMRW'), and
 *   overdue homework is 'HW!!' with today/tomorrow at 'HW!' (legacy had
 *   the two swapped).
 * - When fewer than three items fired, BOTH daily fillers (course roast +
 *   general note) are added; legacy usually added only one.
 * - `all_clear` joins the list whenever nothing actionable exists instead
 *   of being a last-resort fallback.
 * - Template selection is stateless (hash of item id + 15-minute bucket)
 *   instead of the legacy shown-count/shuffle-bag machinery.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rotation interval of the header ticker, in milliseconds. */
export const HEADER_TICKER_ROTATE_MS = 9000

/** How many recently shown item ids the UI should remember (and avoid). */
export const TICKER_RECENT_WINDOW = 5

/** Legacy cap on the per-item weight in the priority-weighted pick pool. */
const PRIORITY_WEIGHT_CAP = 3

/** Homework further out than this many days stays out of the ticker. */
const HOMEWORK_WINDOW_DAYS = 7

/** Exams further out than this many days stay out of the ticker. */
const EXAM_WINDOW_DAYS = 14

/** Incomplete homework count that triggers the hw_many pile nudge. */
const HOMEWORK_PILE_THRESHOLD = 6

/** Unwatched recordings count that upgrades the backlog to recordings_big. */
const RECORDINGS_BIG_THRESHOLD = 10

/** "Starts within this many minutes" boundary between class_soon and class_next. */
const CLASS_SOON_MINUTES = 15

/** Items at or above this priority suppress time-of-day vibes. */
const URGENT_PRIORITY = 7

/** Fewer items than this after the real collectors → add daily fillers. */
const FILLER_THRESHOLD = 3

// ---------------------------------------------------------------------------
// Template catalog (ported verbatim from legacy header-ticker.js)
// ---------------------------------------------------------------------------

export const TICKER_TEMPLATES = {
  no_semester: [
    "No active semester. You're driving without a map.",
    "You have zero semesters selected. That's… bold.",
    'Start a semester first. Then we can bully you productively.',
  ],
  no_courses: [
    'No courses yet. Add one and let the chaos begin.',
    'Your semester is empty. Feed it a course.',
    'No courses found. Click + and build your timetable empire.',
    "No courses. No problems. No degree. (Let's add a course.)",
    "Your course list is empty. That's peaceful… and incorrect.",
  ],
  no_schedule: [
    "No schedule set. You're free… but also in danger.",
    'Your courses have zero class times. Add schedule slots and stop living on hard mode.',
    "No lectures on the timetable. Either you're a genius or the schedule is missing.",
    'Schedule is empty. The calendar is offended.',
  ],
  no_classes_today: [
    'No classes today. Suspiciously peaceful.',
    'Today: no lectures. Use this power wisely.',
    'No classes today. Side quest: do homework before it becomes a boss fight.',
    'No lectures today. This is your one chance to get ahead before chaos returns.',
    'No classes today. Please do not spend this blessing on scrolling.',
  ],
  all_clear: [
    'All clear. Enjoy the calm (and maybe study anyway).',
    'Nothing urgent. This is your chance to get ahead.',
    'No immediate fires. Keep it that way.',
    "You're surprisingly on top of things. Who are you and what did you do with you?",
    'Nothing urgent right now. This is rare. Cherish it.',
    "The task list is quiet. Suspicious… but we'll take it.",
    "You're caught up. Don't panic—this feeling is allowed.",
    'Nothing urgent. Universe is buffering. Enjoy.',
  ],
  late_night: [
    "It's late. If you're still studying, respect. If not… sleep.exe?",
    'Late-night mode detected. Hydrate, stretch, and maybe close TikTok.',
    "It's {time}. Your brain deserves a break. Or a tiny homework sprint.",
    'Night owl energy at {time}. Keep it clean: 20 min work, then sleep.',
    "It's {time}. If you're here by choice, you're powerful. If not, blink twice.",
    '{time}. This is either dedication or a sleep schedule crime scene.',
  ],
  morning: [
    'Good morning. Small win: pick ONE task and finish it.',
    'Morning energy is OP. Use it before it disappears.',
    "You're awake! Time to do something your future self will thank you for.",
    'Morning brain is peak performance. Spend it wisely.',
    'Good morning. One tiny task now = no panic later.',
  ],
  weekend: [
    'Weekend vibes. Also: future-you would love 30 minutes of progress.',
    "It's the weekend. You can rest *and* do one tiny task. Balance.",
    'Weekend = side quests. Choose a homework and delete it from existence.',
    "Weekend. Recharge… then do one thing so Monday doesn't jump-scare you.",
    "It's the weekend. A little progress now = maximum peace later.",
  ],
  class_now: [
    'Lecture is live עכשיו ({start}-{end}). Be academically present™.',
    'שיעור עכשיו{courseMaybe}. פוקוס.',
    'Live right now{courseMaybe}. Notes time.',
    'Class is happening עכשיו ({start}-{end}). No disappearing.',
    'Breaking news: lecture is live. Your attendance is not.',
    'This is not a drill. This is a lecture. עכשיו{courseMaybe}.',
    "LIVE NOW{courseMaybe}. Pretend you're not multitasking.",
    'You are currently in a lecture. Act natural.',
    'Right now ({start}-{end}){courseMaybe}. Phone down gently.',
    "It's class time{courseMaybe}. We're going in.",
    'Lecture now. Minimize chaos. Maximize notes.',
    'Class is live. Your only job is to exist and absorb.',
  ],
  class_soon: [
    'Class in {minutes} minutes{courseMaybe}. This is your warning shot.',
    '{minutes} minutes until lecture{courseMaybe}. Shoes. Keys. Brain. Go.',
    'Incoming in {minutes} min{courseMaybe}. Leave now like you meant it.',
    'Class starts soon{courseMaybe}. Stop side quests. Start main quest.',
  ],
  class_next: [
    'Next lecture at {start}{courseMaybe}. Do not be late.',
    'Lecture starts in {minutes} minutes{courseMaybe}. Move!',
    'Reminder: lecture at {start}{courseMaybe}. You got this.',
    '{minutes} minutes until class{courseMaybe}. Shoes on. Brain on.',
    'Speedrun: arrive before {start}. (You can do it.)',
    'Upcoming at {start}{courseMaybe}. Time to switch to campus-mode.',
    'Next up: {start}{courseMaybe}. Main quest > side quests.',
    'Class at {start}{courseMaybe}. Grab water, keys, dignity.',
    'If you leave now, you can arrive like you meant to. ({start})',
    'Reminder: {start}{courseMaybe}. The bed is a liar.',
    "Next class at {start}{courseMaybe}. Don't let it surprise you.",
    '{start} is coming{courseMaybe}. Your backpack misses you.',
  ],
  class_tomorrow: [
    'Tomorrow at {start}{courseMaybe}. Set the alarm. Respectfully.',
    'Heads up: tomorrow {start}{courseMaybe}. Prepare your brain.',
    "Tomorrow {start}{courseMaybe}. Don't let it jump-scare you.",
    'PSA: tomorrow at {start}{courseMaybe}. Plan like a legend.',
    "Tomorrow's you called. They'd like you to sleep on time. ({start})",
  ],
  hw_nodate: [
    "{title} has no due date. That's how assignments sneak-attack you.",
    'Set a due date for {title}. Your future self will thank you.',
    '{title} is floating in the void (no date). Pin it down.',
    '{title} without a due date is just anxiety in disguise.',
    "No due date for {title}. Bold strategy. Let's not test it.",
    "{title} has no date. That's how tasks become legends (and not in a good way).",
    'No due date for {title}. This is how procrastination gets a passport.',
  ],
  hw_many: [
    "You have {count} unfinished homeworks. That's a whole season of content.",
    '{count} homeworks pending. Pick one. Delete it. Repeat.',
    '{count} homeworks waiting. This is not a collectible set.',
    'Mission: reduce homework count from {count} to {countMinusOne}. Start now.',
    '{count} homeworks pending. This is not a personality trait.',
    "Homeworks remaining: {count}. Let's do some subtraction.",
  ],
  hw_all_done: [
    'All homework is done. Who are you and how can we learn your ways?',
    'Homework status: CLEAN. Enjoy the peace.',
    'No pending homework. This is suspiciously responsible.',
    "Homework: 0. You're living the dream.",
  ],
  hw_overdue: [
    "HAVEN'T YOU STARTED {title} YET?? It's {days} day(s) overdue.",
    '{title} is overdue. Future you is not impressed.',
    'Stop procrastinating: {title} was due {days} day(s) ago.',
    "{title} is {days} day(s) late. That's not a flex.",
    'The deadline left without you: {title} ({days} day(s) ago).',
    'Congratulations, you unlocked: OVERDUE MODE. ({title})',
    "We're not saying panic… but {title} is overdue.",
    'Friendly reminder with a tiny scream: {title} is overdue.',
    "{title} is overdue. Let's do damage control, not self-hate.",
    'Overdue: {title}. Step 1: open it. Step 2: do literally anything.',
    '{title} is overdue. We can still clutch. Open it and do ONE thing.',
    'Overdue homework detected. Calm. Open {title}. Tiny progress. Win.',
  ],
  hw_today: [
    'TODAY: {title}. Do it. Now.',
    'Deadline today: {title}{courseMaybe}.',
    '{title} is due today. Quick win?',
    "Today's menu: {title}. Chef, start cooking.",
    'If you do {title} today, tomorrow-you will send a thank-you note.',
    'Today is the day. {title}. No drama, just results.',
    '{title} due today. We can do hard things.',
    'Reminder: {title} is due today. Do it messy, do it done.',
    '{title} due today. A 60% done is still 100% submitted.',
    'Due today: {title}. Your keyboard is about to see things.',
    '{title} due today. This is your montage moment.',
    'Due today: {title}. Enter goblin mode (but submit).',
  ],
  hw_tomorrow: [
    'Due tomorrow: {title}. Do future-you a favor.',
    '{title} is due tomorrow{courseMaybe}. Start now and avoid the 2am arc.',
    "Tomorrow's deadline is approaching: {title}. Begin the ritual.",
    '{title} due tomorrow. One small chunk today = massive relief.',
  ],
  hw_soon: [
    "Haven't you started {title} yet?? Due in {days} day(s).",
    '{title} due in {days} day(s). Tiny steps count.',
    'Reminder: {title}{courseMaybe} due in {days} day(s).',
    "{days} day(s) until {title}. Start with 10 minutes. That's it.",
    'Procrastination called. I declined. Go start {title}.',
    'Reminder: {title} in {days} day(s). Your brain will thank you.',
    '{title} is coming. You can either start now or panic later.',
    'Small progress > big panic. {title} due in {days} day(s).',
    '{title} due in {days} day(s). Open it. Stare at it. That counts as step 1.',
    '{title} due in {days} day(s). Put 10 minutes on the clock and go.',
    '{title} due in {days} day(s). Do a tiny part. Become unstoppable.',
    '{title} is approaching. You still have time. Use it.',
  ],
  exam: [
    'EXAM ALERT: Moed {examType} in {days} day(s){courseMaybe}.',
    'Exam {examType} in {days} day(s){courseMaybe}. Good luck.',
    'Exam {examType} is coming up ({date}){courseMaybe}.',
    'Countdown: {days} day(s) until exam (Moed {examType}){courseMaybe}.',
    'Exam incoming: Moed {examType}{courseMaybe}. Time to become unstoppable.',
    'Moed {examType} in {days} day(s){courseMaybe}. Start with one topic today.',
    'You vs Moed {examType} in {days} day(s){courseMaybe}. Training arc begins.',
    'Reminder: exam {examType} on {date}{courseMaybe}. You got this.',
    "Exam {examType} on {date}{courseMaybe}. Today's plan: one PDF, no chaos.",
    'Exam incoming: {examType} ({date}){courseMaybe}. One page at a time.',
    'Exam in {days} day(s){courseMaybe}. Do one tiny topic today. Win tomorrow.',
    "Exam countdown running{courseMaybe}. Don't let it spawn-camp you.",
  ],
  exam_today: [
    'EXAM TODAY (Moed {examType}){courseMaybe}. Minimal panic. Maximum focus.',
    "Today's boss fight: exam {examType}{courseMaybe}. You've got this.",
    'Exam day{courseMaybe}. Eat. Breathe. Destroy the questions politely.',
  ],
  exam_tomorrow: [
    'Exam tomorrow (Moed {examType}){courseMaybe}. Tonight is for a calm review.',
    'Tomorrow: exam {examType}{courseMaybe}. Sleep is part of the strategy.',
    'Exam tomorrow{courseMaybe}. One last pass, then rest.',
  ],
  exam_soon: [
    'Exam (Moed {examType}) in {days} day(s){courseMaybe}. Boss-fight territory.',
    'EXAM SOON: Moed {examType} in {days} day(s){courseMaybe}. Start with the easiest topic.',
    'Your exam is close: Moed {examType} in {days} day(s){courseMaybe}. No panic. Just a plan.',
    'Exam soon{courseMaybe}. This is where the training arc becomes real.',
  ],
  recordings_backlog: [
    "{count} recordings waiting{courseMaybe}. That's not going to watch itself.",
    'You have {count} unwatched recordings{courseMaybe}. Snack + lecture?',
    'Reminder: {count} recordings to catch up on{courseMaybe}.',
    "{count} recordings{courseMaybe}. Congratulations, you're basically a streaming service.",
    "{count} recordings pending{courseMaybe}. Start one on 1.25x and pretend it's cardio.",
    "{count} recordings are waiting{courseMaybe}. Pick one and press play. That's it.",
    'Recordings backlog detected: {count}{courseMaybe}. One today = hero arc.',
  ],
  recordings_big: [
    'Backlog is HUGE ({count}){courseMaybe}. Marathon, not meltdown.',
    "{count} recordings{courseMaybe}. That's a whole Netflix season. Start episode 1.",
    'Ok listen. {count} recordings{courseMaybe}. One today = hero arc.',
    '{count} recordings backlog{courseMaybe}. This is a multi-episode saga. Start chapter 1.',
  ],
  recordings_clear: [
    "Recordings backlog: 0. You're dangerously caught up.",
    'No unwatched recordings. This is elite behavior.',
    'Recordings are all watched. Your future self is cheering.',
  ],
  general: [
    "Reminder: you don't need motivation. You need a timer.",
    'If you do 15 minutes now, later-you stops yelling.',
    "Your to-do list isn't scary. It's just loud.",
    'Do the smallest possible version of the task. Still counts.',
    "Open the thing. Name the thing. That's step one.",
    'Tiny progress beats perfect plans.',
    'You can be behind and still make progress today.',
    "Today's strategy: fewer tabs, more output.",
  ],
  general_course_roast: [
    'This course{courseMaybe} is a beautifully engineered obstacle.',
    "Course{courseMaybe}: confidently assigns 6 hours of work like you don't have a life.",
    'Course{courseMaybe} really said “time management” and meant “good luck”.',
    "Course{courseMaybe} thinks it's the main character. You're the one doing side quests.",
    'Course{courseMaybe} has the audacity to exist twice a week.',
    'Course{courseMaybe} is a hobby for people who enjoy suffering (respectfully).',
    'Course{courseMaybe}: somehow both important and impossible.',
    'Course{courseMaybe} is teaching resilience. Not on purpose. But still.',
  ],
} as const satisfies Record<string, readonly string[]>

type TickerCategory = keyof typeof TICKER_TEMPLATES

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** What clicking a ticker item should open. */
export interface TickerTarget {
  type: 'course' | 'homework' | 'recordings' | 'exam' | 'none'
  courseId?: string
  homeworkId?: string
}

export interface TickerItem {
  /** Stable identity for de-dupe and the recently-shown window. */
  id: string
  /** Template category, e.g. 'class_now' / 'hw_overdue'. */
  category: string
  /** Higher shows more often; >= 7 counts as urgent (suppresses vibes). */
  priority: number
  /** Short label rendered before the message, e.g. 'NOW' / 'HW!!'. */
  badge: string
  /** Fully rendered message (no leftover placeholders). */
  text: string
  target: TickerTarget
}

export interface TickerContext {
  /** The selected semester (null when none is selected). */
  semester: Semester | null
  /** The current time; the ONLY source of time/randomness for the build. */
  now: Date
  /**
   * Whether any semester exists at all. Reserved for the UI (setup flows);
   * the built items do not depend on it.
   */
  hasAnySemester: boolean
}

export interface TickerPick {
  /** PRNG seed; pass `tickerSeed(now)` (plus a rotation counter if desired). */
  seed: number
  /** Recently shown item ids, avoided while other candidates remain. */
  recentIds: readonly string[]
}

// ---------------------------------------------------------------------------
// Seeding & deterministic picking helpers
// ---------------------------------------------------------------------------

/**
 * Seed that is stable within a 15-minute bucket of a local day and distinct
 * across buckets and days (legacy rotated message variety every 15 minutes).
 */
export function tickerSeed(now: Date): number {
  const dateNum = now.getFullYear() * 10_000 + (now.getMonth() + 1) * 100 + now.getDate()
  const bucket = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15)
  return dateNum * 100 + bucket
}

/** Legacy stableHashIndex: 31-polynomial string hash reduced modulo `modulo`. */
function hashIndex(seed: string, modulo: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % modulo
}

/** Deterministically picks one element by hashing `seed`; null when empty. */
function pickOne<T>(arr: readonly T[], seed: string): T | null {
  if (arr.length === 0) return null
  // Safe: hashIndex returns 0..length-1 for a non-empty array.
  return arr[hashIndex(seed, arr.length)] as T
}

/** mulberry32 — tiny seeded PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

/**
 * Renders one template from `category`, chosen by hashing the item id with
 * the 15-minute salt (variety over time, stability within a bucket). Missing
 * placeholders become '', whitespace is collapsed — same as the legacy
 * buildFunMessage.
 */
function renderTemplate(
  category: TickerCategory,
  vars: Record<string, string>,
  id: string,
  salt: string,
): string {
  const templates: readonly string[] = TICKER_TEMPLATES[category]
  // Safe: every category has at least one template.
  const template = templates[hashIndex(`${category}|${id}|${salt}`, templates.length)] as string
  return template
    .replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ` (Course Name)` suffix used by {courseMaybe}, '' for blank names. */
function courseTag(name: string): string {
  const trimmed = name.trim()
  return trimmed ? ` (${trimmed})` : ''
}

/** A ticker item before its text is rendered. */
interface RawItem {
  id: string
  category: TickerCategory
  badge: string
  priority: number
  vars: Record<string, string>
  target: TickerTarget
}

function finalize(raw: RawItem, salt: string): TickerItem {
  return {
    id: raw.id,
    category: raw.category,
    priority: raw.priority,
    badge: raw.badge,
    text: renderTemplate(raw.category, raw.vars, raw.id, salt),
    target: raw.target,
  }
}

function infoItem(category: TickerCategory, badge: string, priority: number): RawItem {
  return { id: category, category, badge, priority, vars: {}, target: { type: 'none' } }
}

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
function findCurrentAndNextClass(
  semester: Semester,
  nowDay: number,
  nowMin: number,
): { current: ClassHit | null; next: ClassHit | null } {
  let current: ClassHit | null = null
  let next: ClassHit | null = null

  for (const course of semester.courses) {
    for (const slot of course.schedule) {
      if (slot.day !== nowDay) continue
      const startMin = toMinutes(slot.start)
      let endMin = toMinutes(slot.end)
      if (endMin <= startMin) endMin += 24 * 60 // overnight slot
      if (!current && startMin <= nowMin && nowMin < endMin) {
        current = { course, slot, startMin }
      }
      if (startMin > nowMin && (!next || startMin < next.startMin)) {
        next = { course, slot, startMin }
      }
    }
  }

  return { current, next }
}

/** The earliest class scheduled on tomorrow's weekday, if any. */
function findTomorrowFirstClass(semester: Semester, nowDay: number): ClassHit | null {
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
function collectHomeworkCandidates(semester: Semester, now: Date): HomeworkCandidate[] {
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
function pickUrgentHomework(candidates: readonly HomeworkCandidate[], salt: string): RawItem[] {
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
function findHomeworkWithoutDueDate(semester: Semester): RawItem | null {
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
function collectExamCandidates(semester: Semester, now: Date): ExamCandidate[] {
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
function pickExamItem(candidates: readonly ExamCandidate[], salt: string): RawItem | null {
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
    target: { type: 'exam', courseId: course.id },
  }
}

/** The course with the biggest unwatched-recordings backlog, if any. */
function findRecordingsBacklog(semester: Semester): RawItem | null {
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
        location: current.course.location,
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
