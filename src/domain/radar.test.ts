import { courseSchema, semesterSchema, type Semester } from '@/domain/model'
import {
  RADAR_QUIPS,
  buildRadar,
  formatDuration,
  formatPace,
  quipStart,
  radarBucket,
  renderQuips,
  type RadarContext,
  type RadarKind,
  type RadarSignal,
  type RadarSnapshot,
} from '@/domain/radar'
import { stableIndex } from '@/domain/radar/hash'
import { formatWeekdayDate } from '@/domain/radar/format'
import { SCORE } from '@/domain/radar/constants'

// 2026-03-02 is a Monday (day 1). All fixture times are built from it.
const MON = (h: number, m = 0) => new Date(2026, 2, 2, h, m)

const course = (over: Record<string, unknown> = {}) =>
  courseSchema.parse({ id: 'c1', name: 'Algebra', color: '#8b5cf6', ...over })

const sem = (courses: unknown[]): Semester =>
  semesterSchema.parse({ id: 's1', name: 'Spring 2026', courses })

const ctxOf = (
  semester: Semester | null,
  now: Date,
  snoozedIds: readonly string[] = [],
): RadarContext => ({ semester, now, snoozedIds })

const build = (semester: Semester | null, now: Date, snoozedIds: readonly string[] = []) =>
  buildRadar(ctxOf(semester, now, snoozedIds))

const live = (snap: RadarSnapshot, kind: RadarKind) => snap.live.find((s) => s.kind === kind)
const calm = (snap: RadarSnapshot, kind: RadarKind) => snap.calm.find((s) => s.kind === kind)
const kinds = (signals: readonly RadarSignal[]) => signals.map((s) => s.kind)
const metaTexts = (signal: RadarSignal | undefined) => signal?.meta.map((m) => m.text) ?? []

const hw = (id: string, dueDate: string, completed = false) => ({
  id,
  title: `HW ${id}`,
  dueDate,
  completed,
})

const recTabs = (unwatched: number, watched = 0) => ({
  tabs: [
    {
      id: 'lectures',
      name: 'Lectures',
      items: [
        ...Array.from({ length: unwatched }, (_, i) => ({ id: `u${i}`, watched: false })),
        ...Array.from({ length: watched }, (_, i) => ({ id: `w${i}`, watched: true })),
      ],
    },
  ],
})

const withSlot = (over: Record<string, unknown> = {}) =>
  sem([course({ schedule: [{ day: 1, start: '10:30', end: '12:30' }], ...over })])

describe('buildRadar — setup nudges', () => {
  it('returns only the no_semester nudge (plus a tip) when no semester is selected', () => {
    const snap = build(null, MON(11))
    expect(kinds(snap.live)).toEqual(['no_semester'])
    const nudge = snap.live[0]!
    expect(nudge.title).toBe('Start with a semester')
    expect(nudge.badge).toBe('SETUP')
    expect(nudge.tone).toBe('setup')
    expect(nudge.target).toEqual({ type: 'none' })
    expect(nudge.snoozable).toBe(false)
    expect(nudge.titleIsUser).toBe(false)
    expect(nudge.brief).toBe('')
    expect(RADAR_QUIPS.no_semester).toEqual(expect.arrayContaining(nudge.quips))
    expect(kinds(snap.calm)).toEqual(['tip'])
    expect(snap.snoozedCount).toBe(0)
  })

  it('returns only the no_courses nudge for an empty semester', () => {
    const snap = build(sem([]), MON(11))
    expect(kinds(snap.live)).toEqual(['no_courses'])
    expect(snap.live[0]?.title).toBe('No courses yet')
    expect(snap.live[0]?.snoozable).toBe(false)
  })

  it('adds a snoozable no_schedule nudge when no course has class times', () => {
    const snap = build(sem([course()]), MON(11))
    const nudge = live(snap, 'no_schedule')
    expect(nudge?.title).toBe('No class times yet')
    expect(nudge?.badge).toBe('SETUP')
    expect(nudge?.score).toBe(SCORE.no_schedule)
    expect(nudge?.snoozable).toBe(true)
    expect(metaTexts(nudge)).toEqual(['add class times in a course'])
    expect(live(build(withSlot(), MON(11)), 'no_schedule')).toBeUndefined()
  })
})

describe('buildRadar — classes', () => {
  it('flags the running class with live progress and a countdown to its end', () => {
    const signal = live(build(withSlot({ location: 'Ullman 306' }), MON(11)), 'class_now')
    expect(signal?.badge).toBe('LIVE')
    expect(signal?.tone).toBe('live')
    expect(signal?.score).toBe(SCORE.class_now)
    expect(signal?.title).toBe('Algebra')
    expect(signal?.titleIsUser).toBe(true)
    expect(signal?.courseColor).toBe('#8b5cf6')
    expect(signal?.progress).toBeCloseTo(0.25)
    expect(signal?.meta).toEqual([
      { text: 'Ullman 306', user: true },
      { text: '10:30–12:30' },
      { text: 'ends in 1 h 30 min', tone: 'warn' },
    ])
    expect(signal?.target).toEqual({ type: 'course', courseId: 'c1' })
    expect(signal?.snoozable).toBe(true)
    expect(signal?.brief).toBe('ends in 1 h 30 min')
  })

  it('omits the location fragment when the course has none', () => {
    expect(metaTexts(live(build(withSlot(), MON(11)), 'class_now'))).toEqual([
      '10:30–12:30',
      'ends in 1 h 30 min',
    ])
  })

  it('is live at the exact start, still live one minute before the end, not at the end', () => {
    expect(live(build(withSlot(), MON(10, 30)), 'class_now')?.progress).toBe(0)
    expect(live(build(withSlot(), MON(12, 29)), 'class_now')?.progress).toBeCloseTo(119 / 120)
    expect(live(build(withSlot(), MON(12, 30)), 'class_now')).toBeUndefined()
  })

  it('handles overnight slots on both sides of midnight', () => {
    const overnight = sem([course({ schedule: [{ day: 0, start: '23:00', end: '01:00' }] })])
    const tail = live(build(overnight, MON(0, 30)), 'class_now')
    expect(tail?.progress).toBeCloseTo(0.75)
    expect(metaTexts(tail)).toContain('ends in 30 min')

    const tonight = sem([course({ schedule: [{ day: 1, start: '23:00', end: '01:00' }] })])
    const head = live(build(tonight, MON(23, 30)), 'class_now')
    expect(head?.progress).toBeCloseTo(0.25)
    expect(metaTexts(head)).toContain('ends in 1 h 30 min')
  })

  it('uses class_soon within 15 minutes of the start', () => {
    const snap = build(withSlot(), MON(10, 15))
    const signal = live(snap, 'class_soon')
    expect(signal?.badge).toBe('SOON')
    expect(signal?.tone).toBe('live')
    expect(signal?.score).toBe(SCORE.class_soon)
    expect(signal?.meta).toEqual([
      { text: 'starts in 15 min', tone: 'warn' },
      { text: '10:30–12:30' },
    ])
    expect(signal?.brief).toBe('starts in 15 min')
    expect(live(snap, 'class_next')).toBeUndefined()
  })

  it('uses class_next further out, ranking the sooner class higher', () => {
    const early = live(build(withSlot(), MON(8, 0)), 'class_next')
    expect(early?.badge).toBe('NEXT')
    expect(early?.tone).toBe('info')
    expect(metaTexts(early)).toEqual(['at 10:30', 'in 2 h 30 min'])
    expect(early?.brief).toBe('at 10:30')
    expect(early?.score).toBe(SCORE.class_next - 5)
    const later = live(build(withSlot(), MON(9, 0)), 'class_next')
    expect(later?.score).toBe(SCORE.class_next - 3)
    expect(later!.score).toBeGreaterThan(early!.score)
  })

  it('lifts a class within the hour above tomorrow-homework and 3-day-exam signals', () => {
    const s = sem([
      course({
        schedule: [{ day: 1, start: '10:30', end: '12:30' }],
        homework: [hw('h1', '2026-03-02'), hw('h2', '2026-03-03')],
        exams: { moedA: '2026-03-05', moedB: '' },
      }),
    ])
    // 45 minutes out: bonus applies, one half-hour step deducted.
    const snap = build(s, MON(9, 45))
    expect(live(snap, 'class_next')?.score).toBe(SCORE.class_next + 16 - 1)
    expect(kinds(snap.live)).toEqual(['hw_today', 'class_next', 'exam_soon', 'hw_tomorrow'])
    // 61 minutes out: no bonus, so the class waits behind the urgent tiers.
    expect(kinds(build(s, MON(9, 29)).live)).toEqual([
      'hw_today',
      'exam_soon',
      'hw_tomorrow',
      'class_next',
    ])
  })

  it('interleaves the long-horizon tiers by distance, as documented', () => {
    const s = sem([
      course({
        id: 'c1',
        schedule: [{ day: 1, start: '18:00', end: '20:00' }],
        exams: { moedA: '2026-03-11', moedB: '' },
      }),
      course({ id: 'c2', name: 'Physics', homework: [hw('h1', '2026-03-04')] }),
    ])
    // Class in 8 h (54), exam in 9 days (55), homework in 2 days (54): the exam
    // edges ahead, then the class and the homework tie in insertion order.
    const snap = build(s, MON(10))
    expect(snap.live.map((x) => [x.kind, x.score])).toEqual([
      ['exam', 55],
      ['class_next', 54],
      ['hw_soon', 54],
    ])
  })

  it('never treats a zero-length slot as a class', () => {
    const s = sem([course({ schedule: [{ day: 1, start: '10:30', end: '10:30' }] })])
    for (const now of [MON(10, 30), MON(0, 5), MON(23, 55), MON(17)]) {
      const snap = build(s, now)
      expect(kinds(snap.live).some((k) => k.startsWith('class'))).toBe(false)
    }
    // It counts as a schedule (the user did enter it) but not as a class today.
    expect(live(build(s, MON(11)), 'no_schedule')).toBeUndefined()
    expect(calm(build(s, MON(11)), 'no_classes_today')).toBeDefined()
    // Nor as tomorrow's first class.
    const tomorrowZero = sem([
      course({
        schedule: [
          { day: 2, start: '09:00', end: '09:00' },
          { day: 2, start: '11:00', end: '13:00' },
        ],
      }),
    ])
    const preview = live(build(tomorrowZero, MON(17)), 'class_tomorrow')
    expect(metaTexts(preview)).toEqual(['tomorrow at 11:00'])
  })

  it('previews Sunday from Saturday evening and never in the small hours', () => {
    const s = sem([course({ schedule: [{ day: 0, start: '10:30', end: '12:30' }] })])
    const sat = new Date(2026, 2, 7, 18, 0)
    expect(live(build(s, sat), 'class_tomorrow')?.brief).toBe('tomorrow at 10:30')
    const sunSmallHours = new Date(2026, 2, 8, 0, 30)
    expect(live(build(s, sunSmallHours), 'class_tomorrow')).toBeUndefined()
    expect(live(build(s, sunSmallHours), 'class_next')).toBeDefined()
  })

  it('caps the distance penalty so a far-off class still outranks backlogs and nudges', () => {
    const signal = live(build(withSlot(), MON(0, 5)), 'class_next')
    expect(signal?.score).toBe(SCORE.class_next - 16)
    expect(signal!.score).toBeGreaterThan(SCORE.recordings_big)
    expect(signal!.score).toBeGreaterThan(SCORE.hw_many)
  })

  it('shows both the live class and the next one on a two-slot day, live first', () => {
    const s = sem([
      course({
        schedule: [
          { day: 1, start: '10:30', end: '12:30' },
          { day: 1, start: '14:00', end: '16:00' },
        ],
      }),
    ])
    expect(kinds(build(s, MON(11)).live)).toEqual(['class_now', 'class_next'])
  })

  it('previews tomorrow only in the evening and only once today is done', () => {
    const s = sem([
      course({
        schedule: [
          { day: 2, start: '14:00', end: '16:00' },
          { day: 2, start: '09:30', end: '11:30' },
        ],
      }),
    ])
    const signal = live(build(s, MON(17)), 'class_tomorrow')
    expect(signal?.badge).toBe('TOMORROW')
    expect(signal?.score).toBe(SCORE.class_tomorrow)
    expect(metaTexts(signal)).toEqual(['tomorrow at 09:30', '2 classes tomorrow'])
    expect(signal?.brief).toBe('tomorrow at 09:30')
    expect(signal?.target).toEqual({ type: 'course', courseId: 'c1' })
    expect(live(build(s, MON(11)), 'class_tomorrow')).toBeUndefined()

    const single = sem([
      course({ location: 'Taub 2', schedule: [{ day: 2, start: '09:30', end: '11:30' }] }),
    ])
    expect(metaTexts(live(build(single, MON(17)), 'class_tomorrow'))).toEqual([
      'tomorrow at 09:30',
      'Taub 2',
    ])
  })

  it('adds a sleep-aware quip to the late-night preview of tomorrow', () => {
    const s = sem([course({ schedule: [{ day: 2, start: '09:30', end: '11:30' }] })])
    const snap = build(s, MON(23, 30))
    expect(kinds(snap.live)).toEqual(['class_tomorrow'])
    expect(live(snap, 'class_tomorrow')?.quips).toContain("It's 23:30. Set the alarm, then sleep.")
    expect(
      live(build(s, MON(17)), 'class_tomorrow')?.quips.some((q) => q.includes('alarm, then')),
    ).toBe(false)
  })

  it('suppresses class_tomorrow while a class is still ahead today', () => {
    const s = sem([
      course({
        schedule: [
          { day: 1, start: '18:00', end: '20:00' },
          { day: 2, start: '09:30', end: '11:30' },
        ],
      }),
    ])
    const snap = build(s, MON(17))
    expect(live(snap, 'class_tomorrow')).toBeUndefined()
    expect(live(snap, 'class_next')).toBeDefined()
  })
})

describe('buildRadar — homework', () => {
  const semWith = (...hws: unknown[]) => sem([course({ homework: hws })])

  it('flags overdue homework as critical with a Done action', () => {
    const signal = live(build(semWith(hw('h1', '2026-03-01')), MON(11)), 'hw_overdue')
    expect(signal?.badge).toBe('HW!!')
    expect(signal?.tone).toBe('critical')
    expect(signal?.score).toBe(SCORE.hw_overdue)
    expect(signal?.title).toBe('HW h1')
    expect(signal?.titleIsUser).toBe(true)
    expect(signal?.meta).toEqual([
      { text: 'Algebra', user: true },
      { text: '1 day overdue', tone: 'critical' },
    ])
    expect(signal?.target).toEqual({ type: 'homework', courseId: 'c1', homeworkId: 'h1' })
    expect(signal?.homework).toEqual({ courseId: 'c1', homeworkId: 'h1' })
    expect(signal?.courseColor).toBe('#8b5cf6')
    expect(signal?.snoozable).toBe(true)
    expect(signal?.brief).toBe('1 day overdue')
  })

  it('pluralises the overdue day count', () => {
    const signal = live(build(semWith(hw('h1', '2026-02-27')), MON(11)), 'hw_overdue')
    expect(metaTexts(signal)).toContain('3 days overdue')
  })

  it('buckets today / tomorrow / soon with matching tones and scores', () => {
    const today = live(build(semWith(hw('h1', '2026-03-02')), MON(11)), 'hw_today')
    expect(today?.badge).toBe('HW!')
    expect(today?.tone).toBe('warn')
    expect(today?.score).toBe(SCORE.hw_today)
    expect(today?.meta[1]).toEqual({ text: 'due today', tone: 'warn' })

    const tomorrow = live(build(semWith(hw('h1', '2026-03-03')), MON(11)), 'hw_tomorrow')
    expect(tomorrow?.badge).toBe('HW!')
    expect(tomorrow?.score).toBe(SCORE.hw_tomorrow)
    expect(tomorrow?.meta[1]).toEqual({ text: 'due tomorrow', tone: 'warn' })

    const soon = live(build(semWith(hw('h1', '2026-03-05')), MON(11)), 'hw_soon')
    expect(soon?.badge).toBe('HW')
    expect(soon?.tone).toBe('info')
    expect(soon?.score).toBe(SCORE.hw_soon - 6)
    expect(soon?.meta[1]).toEqual({ text: 'due in 3 days' })
  })

  it('keeps homework due in exactly 7 days and drops anything later', () => {
    expect(live(build(semWith(hw('h1', '2026-03-09')), MON(11)), 'hw_soon')?.score).toBe(
      SCORE.hw_soon - 14,
    )
    const far = build(semWith(hw('h1', '2026-03-10')), MON(11))
    expect(kinds(far.live).filter((k) => k.startsWith('hw_'))).toHaveLength(0)
  })

  it('skips completed homework entirely', () => {
    const snap = build(semWith(hw('h1', '2026-03-01', true)), MON(11))
    expect(kinds(snap.live).some((k) => k.startsWith('hw_'))).toBe(false)
  })

  it('picks the most urgent item first regardless of course order', () => {
    const s = sem([
      course({ id: 'c1', homework: [hw('h1', '2026-03-05')] }),
      course({ id: 'c2', name: 'Physics', homework: [hw('h2', '2026-03-01')] }),
    ])
    const hws = build(s, MON(11)).live.filter((x) => x.kind.startsWith('hw_'))
    expect(hws.map((x) => x.id)).toEqual(['hw:c2:h2', 'hw:c1:h1'])
  })

  it('prefers a different course for the second pick, else the same course', () => {
    const mixed = sem([
      course({ id: 'c1', homework: [hw('h1', '2026-03-01'), hw('h2', '2026-03-02')] }),
      course({ id: 'c2', name: 'Physics', homework: [hw('h3', '2026-03-03')] }),
    ])
    expect(
      build(mixed, MON(11))
        .live.filter((x) => x.kind.startsWith('hw_'))
        .map((x) => x.id),
    ).toEqual(['hw:c1:h1', 'hw:c2:h3'])

    const single = semWith(hw('h1', '2026-03-01'), hw('h2', '2026-03-02'), hw('h3', '2026-03-03'))
    expect(
      build(single, MON(11))
        .live.filter((x) => x.kind.startsWith('hw_'))
        .map((x) => x.id),
    ).toEqual(['hw:c1:h1', 'hw:c1:h2'])
  })

  it('nudges about homework without a due date', () => {
    const signal = live(build(semWith(hw('h1', '')), MON(11)), 'hw_nodate')
    expect(signal?.badge).toBe('HW')
    expect(signal?.score).toBe(SCORE.hw_nodate)
    expect(signal?.meta).toEqual([{ text: 'Algebra', user: true }, { text: 'no due date' }])
    expect(signal?.brief).toBe('no due date')
    expect(signal?.homework).toEqual({ courseId: 'c1', homeworkId: 'h1' })
    expect(signal?.target).toEqual({ type: 'homework', courseId: 'c1', homeworkId: 'h1' })
  })

  it('flags a pile of 6+ open assignments and says how many courses it spans', () => {
    const pile = Array.from({ length: 6 }, (_, i) => hw(`h${i}`, '2026-05-01'))
    const one = live(build(semWith(...pile), MON(11)), 'hw_many')
    expect(one?.title).toBe('6 open assignments')
    expect(one?.badge).toBe('HW+')
    expect(one?.score).toBe(SCORE.hw_many)
    expect(one?.meta).toEqual([])
    expect(one?.brief).toBe('')
    expect(one?.target).toEqual({ type: 'none' })
    expect(one?.quips).toContain('Mission: get it down to 5. Start now.')

    const spread = sem([
      course({ id: 'c1', homework: pile.slice(0, 3) }),
      course({ id: 'c2', name: 'Physics', homework: pile.slice(3) }),
    ])
    expect(metaTexts(live(build(spread, MON(11)), 'hw_many'))).toEqual(['across 2 courses'])

    const five = Array.from({ length: 5 }, (_, i) => hw(`h${i}`, '2026-05-01'))
    expect(live(build(semWith(...five), MON(11)), 'hw_many')).toBeUndefined()
  })

  it('mentions usable free time before the next class in homework and class quips', () => {
    const s = sem([
      course({
        schedule: [{ day: 1, start: '10:30', end: '12:30' }],
        homework: [hw('h1', '2026-03-05')],
      }),
    ])
    const snap = build(s, MON(8))
    expect(live(snap, 'hw_soon')?.quips).toContain("You're free for 2 h 30 min. A first pass fits.")
    expect(live(snap, 'class_next')?.quips).toContain(
      'Free for 2 h 30 min — enough for a homework sprint.',
    )

    // Too short a gap, or a class already running: no free-time line.
    expect(live(build(s, MON(10)), 'hw_soon')?.quips.some((q) => q.includes('free'))).toBe(false)
    expect(live(build(s, MON(11)), 'hw_soon')?.quips.some((q) => q.includes('free'))).toBe(false)
    // Nothing to spend the time on: the class keeps its ordinary quips.
    expect(
      live(build(withSlot(), MON(8)), 'class_next')?.quips.some((q) => q.includes('Free for')),
    ).toBe(false)
  })
})

describe('buildRadar — exams', () => {
  const semWithExams = (moedA: string, moedB = '', over: Record<string, unknown> = {}) =>
    sem([course({ exams: { moedA, moedB }, ...over })])

  it('flags an exam today as critical with a moed deep-link', () => {
    const signal = live(build(semWithExams('2026-03-02'), MON(11)), 'exam_today')
    expect(signal?.badge).toBe('EXAM!!')
    expect(signal?.tone).toBe('critical')
    expect(signal?.score).toBe(SCORE.exam_today)
    expect(signal?.title).toBe('Algebra')
    expect(signal?.meta).toEqual([
      { text: 'Moed A' },
      { text: 'Mon, Mar 2' },
      { text: 'today', tone: 'critical' },
    ])
    expect(signal?.target).toEqual({ type: 'exam', courseId: 'c1', moed: 'A' })
    expect(signal?.brief).toBe('Moed A today')
  })

  it('buckets tomorrow / soon / upcoming with distance-aware scores', () => {
    const tomorrow = live(build(semWithExams('2026-03-03'), MON(11)), 'exam_tomorrow')
    expect(tomorrow?.badge).toBe('EXAM!')
    expect(tomorrow?.tone).toBe('warn')
    expect(tomorrow?.score).toBe(SCORE.exam_tomorrow)
    expect(tomorrow?.meta[2]).toEqual({ text: 'tomorrow', tone: 'warn' })

    const soon = live(build(semWithExams('2026-03-05'), MON(11)), 'exam_soon')
    expect(soon?.badge).toBe('EXAM!')
    expect(soon?.score).toBe(SCORE.exam_soon)
    expect(soon?.meta[2]).toEqual({ text: 'in 3 days', tone: 'warn' })

    const ten = live(build(semWithExams('2026-03-12'), MON(11)), 'exam')
    expect(ten?.badge).toBe('EXAM')
    expect(ten?.tone).toBe('info')
    expect(ten?.score).toBe(SCORE.exam - 6)
    expect(ten?.meta[2]).toEqual({ text: 'in 10 days' })
    expect(ten?.brief).toBe('Moed A in 10 days')

    expect(live(build(semWithExams('2026-03-16'), MON(11)), 'exam')?.score).toBe(SCORE.exam - 10)
  })

  it('ignores exams more than 14 days away and past exams', () => {
    for (const date of ['2026-03-17', '2026-03-01']) {
      expect(kinds(build(semWithExams(date), MON(11)).live).some((k) => k.startsWith('exam'))).toBe(
        false,
      )
    }
  })

  it('reads moed B dates too', () => {
    const signal = live(build(semWithExams('', '2026-03-05'), MON(11)), 'exam_soon')
    expect(signal?.meta[0]).toEqual({ text: 'Moed B' })
    expect(signal?.target).toEqual({ type: 'exam', courseId: 'c1', moed: 'B' })
  })

  it('surfaces a single exam: the nearest one', () => {
    const s = sem([
      course({ id: 'c1', exams: { moedA: '2026-03-07', moedB: '' } }),
      course({ id: 'c2', name: 'Physics', exams: { moedA: '2026-03-02', moedB: '' } }),
    ])
    const exams = build(s, MON(11)).live.filter((x) => x.kind.startsWith('exam'))
    expect(exams.map((x) => x.id)).toEqual(['exam:c2:A'])
  })

  it('adds a study-pace insight from the course’s unwatched recordings', () => {
    const signal = live(
      build(semWithExams('2026-03-12', '', { recordings: recTabs(5) }), MON(11)),
      'exam',
    )
    expect(metaTexts(signal)).toEqual([
      'Moed A',
      'Thu, Mar 12',
      'in 10 days',
      '5 unwatched',
      '1 lecture every 2 days',
    ])
    // Exam day: the backlog is stated, but there is no pace left to suggest.
    const today = live(
      build(semWithExams('2026-03-02', '', { recordings: recTabs(2) }), MON(11)),
      'exam_today',
    )
    expect(metaTexts(today)).toEqual(['Moed A', 'Mon, Mar 2', 'today', '2 unwatched'])
    // Nothing unwatched: no insight fragments at all.
    expect(
      metaTexts(
        live(build(semWithExams('2026-03-12', '', { recordings: recTabs(0, 3) }), MON(11)), 'exam'),
      ),
    ).toEqual(['Moed A', 'Thu, Mar 12', 'in 10 days'])
  })
})

describe('buildRadar — recordings', () => {
  it('flags a small backlog and upgrades 10+ to recordings_big', () => {
    const small = live(
      build(sem([course({ recordings: recTabs(3) })]), MON(11)),
      'recordings_backlog',
    )
    expect(small?.badge).toBe('REC')
    expect(small?.score).toBe(SCORE.recordings_backlog)
    expect(small?.meta).toEqual([{ text: '3 unwatched' }])
    expect(small?.target).toEqual({ type: 'recordings', courseId: 'c1' })
    expect(small?.courseColor).toBe('#8b5cf6')
    expect(small?.brief).toBe('3 unwatched')

    const big = live(build(sem([course({ recordings: recTabs(12) })]), MON(11)), 'recordings_big')
    expect(big?.badge).toBe('REC!')
    expect(big?.score).toBe(SCORE.recordings_big)
    expect(metaTexts(big)).toEqual(['12 unwatched'])
  })

  it('picks the course with the biggest backlog and only counts unwatched items', () => {
    const s = sem([
      course({ id: 'c1', recordings: recTabs(3, 4) }),
      course({ id: 'c2', name: 'Physics', recordings: recTabs(5) }),
    ])
    const signal = live(build(s, MON(11)), 'recordings_backlog')
    expect(signal?.target.courseId).toBe('c2')
    expect(metaTexts(signal)).toEqual(['5 unwatched'])
    const allWatched = build(sem([course({ recordings: recTabs(0, 2) })]), MON(11))
    expect(kinds(allWatched.live).some((k) => k.startsWith('recordings'))).toBe(false)
  })
})

describe('buildRadar — ranking, snoozing, determinism', () => {
  const busy = () =>
    sem([
      course({
        schedule: [{ day: 1, start: '10:30', end: '12:30' }],
        homework: [hw('h1', '2026-03-01')],
        exams: { moedA: '2026-03-04', moedB: '' },
        recordings: recTabs(3),
      }),
    ])

  it('ranks live signals by score, descending, with unique ids and clean quips', () => {
    const snap = build(busy(), MON(11))
    expect(kinds(snap.live)).toEqual(['class_now', 'hw_overdue', 'exam_soon', 'recordings_backlog'])
    expect(snap.live.map((s) => s.score)).toEqual([100, 92, 84, 30])
    expect(new Set(snap.live.map((s) => s.id)).size).toBe(snap.live.length)
    for (const signal of [...snap.live, ...snap.calm]) {
      expect(signal.quips.length).toBeGreaterThan(0)
      for (const quip of signal.quips) expect(quip).not.toMatch(/[{}]/)
      expect(signal.title.length).toBeGreaterThan(0)
    }
  })

  it('drops snoozed signals from the live queue and reports the count', () => {
    const snap = build(busy(), MON(11), ['hw:c1:h1', 'recordings:c1'])
    expect(kinds(snap.live)).toEqual(['class_now', 'exam_soon'])
    expect(snap.snoozedCount).toBe(2)
    const clear = calm(snap, 'all_clear')
    expect(clear?.title).toBe('Quiet for now')
    expect(metaTexts(clear)).toContain('2 snoozed')
  })

  it('reveals the next candidate when a capped pick is snoozed', () => {
    const s = sem([
      course({
        id: 'c1',
        homework: [hw('h1', '2026-03-01'), hw('h2', '2026-03-02'), hw('h3', '2026-03-03')],
        exams: { moedA: '2026-03-03', moedB: '2026-03-06' },
        recordings: recTabs(4),
      }),
      course({ id: 'c2', name: 'Physics', recordings: recTabs(2), homework: [hw('h4', '')] }),
      course({ id: 'c3', name: 'Chemistry', homework: [hw('h5', '')] }),
    ])
    const snap = build(s, MON(11), [
      'hw:c1:h1',
      'hw:c1:h2',
      'exam:c1:A',
      'recordings:c1',
      'hw_nodate:c2:h4',
    ])
    const ids = snap.live.map((x) => x.id)
    expect(ids).toContain('hw:c1:h3')
    expect(ids).toContain('exam:c1:B')
    expect(ids).toContain('recordings:c2')
    expect(ids).toContain('hw_nodate:c3:h5')
    expect(ids).not.toContain('hw:c1:h1')
    expect(ids).not.toContain('exam:c1:A')
    expect(snap.snoozedCount).toBe(5)
  })

  it('keeps a class snoozed for the whole day as it moves from next to soon to live', () => {
    const snoozed = ['class:c1:1:10:30']
    for (const now of [MON(8), MON(10, 20), MON(11)]) {
      const snap = build(withSlot(), now, snoozed)
      expect(kinds(snap.live).some((k) => k.startsWith('class'))).toBe(false)
      expect(snap.snoozedCount).toBe(1)
    }
    // Another class on the same day is unaffected, and so is tomorrow's preview.
    const two = sem([
      course({
        schedule: [
          { day: 1, start: '10:30', end: '12:30' },
          { day: 1, start: '14:00', end: '16:00' },
        ],
      }),
    ])
    expect(live(build(two, MON(11), snoozed), 'class_next')?.id).toBe('class:c1:1:14:00')
    const tomorrow = sem([course({ schedule: [{ day: 2, start: '10:30', end: '12:30' }] })])
    expect(live(build(tomorrow, MON(17), snoozed), 'class_tomorrow')).toBeDefined()
  })

  it('ignores snoozed ids that do not match anything', () => {
    const snap = build(busy(), MON(11), ['nope'])
    expect(snap.live).toHaveLength(4)
    expect(snap.snoozedCount).toBe(0)
    expect(calm(snap, 'all_clear')?.title).toBe('All clear')
  })

  it('is deterministic for identical contexts', () => {
    expect(build(busy(), MON(11))).toEqual(build(busy(), MON(11)))
  })

  it('keeps quips stable within a 15-minute bucket and moves them across buckets', () => {
    const s = sem([course({ homework: [hw('h1', '2026-03-05')] })])
    const a = live(build(s, MON(11, 0)), 'hw_soon')!
    const b = live(build(s, MON(11, 14)), 'hw_soon')!
    expect(a.quips).toEqual(b.quips)
    const bucket = radarBucket(MON(11, 0))
    expect(radarBucket(MON(11, 14))).toBe(bucket)
    expect(radarBucket(MON(11, 15))).not.toBe(bucket)
    expect(radarBucket(new Date(2026, 2, 3, 11, 0))).not.toBe(bucket)
  })
})

describe('buildRadar — calm rotation', () => {
  // A Wednesday-only schedule: nothing today, nothing to preview for tomorrow.
  const quiet = () => sem([course({ schedule: [{ day: 3, start: '09:30', end: '11:30' }] })])

  it('leads with the late-night vibe between 23:00 and 04:59 and shows the clock', () => {
    for (const now of [MON(23, 30), MON(0, 30), MON(4, 59)]) {
      const snap = build(quiet(), now)
      expect(snap.live).toEqual([])
      expect(snap.calm[0]?.kind).toBe('late_night')
      expect(snap.calm[0]?.badge).toBe('ZZZ')
    }
    expect(calm(build(quiet(), MON(23, 30)), 'late_night')?.title).toBe("It's 23:30")
    expect(calm(build(quiet(), MON(22, 59)), 'late_night')).toBeUndefined()
    expect(calm(build(quiet(), MON(5, 0)), 'late_night')).toBeUndefined()
  })

  it('shows the morning vibe from 05:00 to 09:59', () => {
    expect(calm(build(quiet(), MON(5, 0)), 'morning')?.title).toBe('Good morning')
    expect(calm(build(quiet(), MON(9, 59)), 'morning')?.badge).toBe('AM')
    expect(calm(build(quiet(), MON(10, 0)), 'morning')).toBeUndefined()
  })

  it('treats Friday afternoon and Saturday as the weekend (the week is Sun–Thu)', () => {
    const sat = new Date(2026, 2, 7, 12, 0)
    const friAfternoon = new Date(2026, 2, 6, 13, 0)
    const friMorning = new Date(2026, 2, 6, 12, 59)
    const sun = new Date(2026, 2, 8, 12, 0)
    expect(calm(build(quiet(), sat), 'weekend')?.badge).toBe('WEEKEND')
    expect(calm(build(quiet(), friAfternoon), 'weekend')?.title).toBe('Weekend mode')
    expect(calm(build(quiet(), friMorning), 'weekend')).toBeUndefined()
    expect(calm(build(quiet(), sun), 'weekend')).toBeUndefined()
  })

  it('flags a free day only when a schedule exists elsewhere and it is not late', () => {
    expect(calm(build(quiet(), MON(11)), 'no_classes_today')?.badge).toBe('FREE')
    expect(calm(build(quiet(), MON(23, 30)), 'no_classes_today')).toBeUndefined()
    expect(calm(build(sem([course()]), MON(11)), 'no_classes_today')).toBeUndefined()
  })

  it('says classes are done once today’s last class has ended', () => {
    const snap = build(withSlot(), MON(13))
    expect(snap.live).toEqual([])
    expect(calm(snap, 'done_today')?.badge).toBe('DONE')
    expect(calm(build(withSlot(), MON(9)), 'done_today')).toBeUndefined()
    expect(calm(build(withSlot(), MON(23, 30)), 'done_today')).toBeUndefined()
  })

  it('always ends with all-clear (with progress stats), a course roast and a tip', () => {
    const s = sem([
      course({
        homework: [
          hw('h1', '2026-02-01', true),
          hw('h2', '2026-02-02', true),
          hw('h3', '2026-05-01'),
        ],
        recordings: recTabs(1, 1),
        exams: { moedA: '2026-02-20', moedB: '2026-04-20' },
      }),
    ])
    const snap = build(s, MON(11))
    expect(kinds(snap.calm).slice(-3)).toEqual(['all_clear', 'roast', 'tip'])
    const clear = calm(snap, 'all_clear')
    expect(clear?.badge).toBe('OK')
    expect(clear?.tone).toBe('calm')
    expect(metaTexts(clear)).toEqual([
      '2/3 homework done',
      '1/2 recordings watched',
      '1/2 exams behind you',
    ])
    const roast = calm(snap, 'roast')
    expect(roast?.title).toBe('Algebra')
    expect(roast?.titleIsUser).toBe(true)
    expect(roast?.target).toEqual({ type: 'course', courseId: 'c1' })
    expect(roast?.badge).toBe('VIBE')
    const tip = calm(snap, 'tip')
    expect(tip?.title).toBe('Study tip')
    expect(tip?.badge).toBe('NOTE')
    expect(tip?.quips).toEqual([...RADAR_QUIPS.tip])
  })

  it('counts hidden and custom exams in the all-clear stats', () => {
    const s = semesterSchema.parse({
      id: 's1',
      name: 'Spring 2026',
      courses: [course({ exams: { moedA: '2026-02-20', moedB: '' } })],
      hiddenExamIds: ['c1:A'],
      customExams: [{ id: 'x1', name: 'Lab exam', date: '2026-03-20' }],
    })
    expect(metaTexts(calm(build(s, MON(11)), 'all_clear'))).toEqual(['1/2 exams behind you'])
  })

  it('reads "nothing pending" for a course with no content yet', () => {
    expect(metaTexts(calm(build(sem([course()]), MON(11)), 'all_clear'))).toEqual([
      'nothing pending',
    ])
  })

  it('roasts the same course all day and rotates across days', () => {
    const s = sem([
      course({ id: 'c1' }),
      course({ id: 'c2', name: 'Physics' }),
      course({ id: 'c3', name: 'Chemistry' }),
    ])
    const morning = calm(build(s, MON(8)), 'roast')?.id
    expect(calm(build(s, MON(20)), 'roast')?.id).toBe(morning)
    const ids = new Set<string>()
    for (let day = 0; day < 14; day++) {
      ids.add(calm(build(s, new Date(2026, 2, 2 + day, 12)), 'roast')!.id)
    }
    expect(ids.size).toBeGreaterThan(1)
  })
})

describe('quips', () => {
  it('every kind has at least one unconditional quip', () => {
    for (const kind of Object.keys(RADAR_QUIPS) as RadarKind[]) {
      expect(renderQuips(kind, {}).length).toBeGreaterThan(0)
    }
  })

  it('fills placeholders, drops conditional lines whose variable is missing, collapses spaces', () => {
    expect(renderQuips('class_next', { start: '10:30' })).toContain(
      'Speedrun: arrive before 10:30.',
    )
    expect(renderQuips('class_next', { start: '10:30' }).some((q) => q.includes('Free for'))).toBe(
      false,
    )
    expect(renderQuips('class_next', { start: '10:30', free: '2 h' })).toContain(
      'Free for 2 h — enough for a homework sprint.',
    )
    // A missing non-conditional placeholder renders as '' without leaving braces.
    for (const quip of renderQuips('hw_many', {})) expect(quip).not.toMatch(/[{}]/)
  })

  it('adds late-night lines to long-horizon signals only late at night', () => {
    const s = sem([course({ exams: { moedA: '2026-03-12', moedB: '' } })])
    const night = live(build(s, MON(23, 30)), 'exam')
    expect(night?.quips).toContain("It's 23:30. Sleep now, sprint tomorrow.")
    const day = live(build(s, MON(11)), 'exam')
    expect(day?.quips.some((q) => q.includes('Sleep now'))).toBe(false)
  })
})

describe('hashing', () => {
  it('quipStart is deterministic, in range, and differs across signals/buckets', () => {
    for (let i = 0; i < 50; i++) {
      const start = quipStart(`sig${i}`, 123, 7)
      expect(start).toBe(quipStart(`sig${i}`, 123, 7))
      expect(start).toBeGreaterThanOrEqual(0)
      expect(start).toBeLessThan(7)
    }
    const starts = new Set<number>()
    for (let bucket = 0; bucket < 40; bucket++) starts.add(quipStart('a', bucket, 7))
    expect(starts.size).toBeGreaterThan(1)
  })

  it('stableIndex handles an empty modulo', () => {
    expect(stableIndex('anything', 0)).toBe(0)
  })
})

describe('formatting', () => {
  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(-3)).toBe('0 min')
    expect(formatDuration(12)).toBe('12 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(130)).toBe('2 h 10 min')
  })

  it('formatPace', () => {
    expect(formatPace(0, 5)).toBeNull()
    expect(formatPace(5, 0)).toBeNull()
    expect(formatPace(5, 10)).toBe('1 lecture every 2 days')
    expect(formatPace(10, 5)).toBe('2 lectures a day')
    expect(formatPace(5, 5)).toBe('1 lecture a day')
    expect(formatPace(3, 5)).toBe('1 lecture a day')
    expect(formatPace(7, 10)).toBe('1 lecture a day')
  })

  it('formatWeekdayDate returns an empty string for an unparseable date', () => {
    expect(formatWeekdayDate('nope')).toBe('')
    expect(formatWeekdayDate('2026-03-02')).toBe('Mon, Mar 2')
  })
})
