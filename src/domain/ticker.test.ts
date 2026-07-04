import { courseSchema, semesterSchema, type Semester } from '@/domain/model'
import {
  HEADER_TICKER_ROTATE_MS,
  TICKER_RECENT_WINDOW,
  TICKER_TEMPLATES,
  buildTickerItems,
  pickTickerItem,
  tickerSeed,
  type TickerContext,
  type TickerItem,
} from '@/domain/ticker'

// 2026-03-02 is a Monday (day 1). All fixture times are built from it.
const MON = (h: number, m = 0) => new Date(2026, 2, 2, h, m)

const course = (over: Record<string, unknown> = {}) =>
  courseSchema.parse({ id: 'c1', name: 'Algebra', color: '#8b5cf6', ...over })

const sem = (courses: unknown[]): Semester =>
  semesterSchema.parse({ id: 's1', name: 'Spring 2026', courses })

const ctxOf = (semester: Semester | null, now: Date, hasAnySemester = true): TickerContext => ({
  semester,
  now,
  hasAnySemester,
})

const find = (items: TickerItem[], category: string) => items.find((i) => i.category === category)
const cats = (items: TickerItem[]) => items.map((i) => i.category)

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

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl
    .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\s+/g, ' ')
    .trim()

describe('constants', () => {
  it('exports the legacy rotation interval and recent window', () => {
    expect(HEADER_TICKER_ROTATE_MS).toBe(9000)
    expect(TICKER_RECENT_WINDOW).toBe(5)
  })
})

describe('TICKER_TEMPLATES', () => {
  it('ports the full legacy catalog (28 categories, 183 templates)', () => {
    expect(Object.keys(TICKER_TEMPLATES)).toHaveLength(28)
    for (const templates of Object.values(TICKER_TEMPLATES)) {
      expect(templates.length).toBeGreaterThan(0)
    }
    const total = Object.values(TICKER_TEMPLATES).reduce((n, arr) => n + arr.length, 0)
    expect(total).toBe(183)
  })

  it('keeps the Hebrew flourishes verbatim', () => {
    expect(TICKER_TEMPLATES.class_now).toContain('שיעור עכשיו{courseMaybe}. פוקוס.')
    expect(TICKER_TEMPLATES.class_now[0]).toBe(
      'Lecture is live עכשיו ({start}-{end}). Be academically present™.',
    )
    expect(TICKER_TEMPLATES.hw_overdue[0]).toBe(
      "HAVEN'T YOU STARTED {title} YET?? It's {days} day(s) overdue.",
    )
  })

  it('keeps per-category counts from the legacy file', () => {
    expect(TICKER_TEMPLATES.class_now).toHaveLength(12)
    expect(TICKER_TEMPLATES.hw_today).toHaveLength(12)
    expect(TICKER_TEMPLATES.exam).toHaveLength(12)
    expect(TICKER_TEMPLATES.general).toHaveLength(8)
    expect(TICKER_TEMPLATES.general_course_roast).toHaveLength(8)
  })
})

describe('tickerSeed', () => {
  it('is stable within a 15-minute bucket', () => {
    expect(tickerSeed(MON(10, 0))).toBe(tickerSeed(MON(10, 14)))
  })

  it('changes across the 15-minute boundary (10:14 vs 10:16)', () => {
    expect(tickerSeed(MON(10, 14))).not.toBe(tickerSeed(MON(10, 16)))
    expect(tickerSeed(MON(10, 15))).toBe(tickerSeed(MON(10, 16)))
  })

  it('changes across days', () => {
    expect(tickerSeed(new Date(2026, 2, 2, 10, 0))).not.toBe(
      tickerSeed(new Date(2026, 2, 3, 10, 0)),
    )
  })
})

describe('buildTickerItems — setup nudges', () => {
  it('returns only the no_semester nudge when no semester is selected', () => {
    const items = buildTickerItems(ctxOf(null, MON(11), false))
    expect(items).toHaveLength(1)
    const item = items[0]
    expect(item?.id).toBe('no_semester')
    expect(item?.category).toBe('no_semester')
    expect(item?.badge).toBe('SETUP')
    expect(item?.priority).toBe(1)
    expect(item?.target).toEqual({ type: 'none' })
    expect(TICKER_TEMPLATES.no_semester).toContain(item?.text)
  })

  it('shows no_semester whether or not other semesters exist', () => {
    const a = buildTickerItems(ctxOf(null, MON(11), false))
    const b = buildTickerItems(ctxOf(null, MON(11), true))
    expect(a).toEqual(b)
  })

  it('returns only the no_courses nudge for an empty semester', () => {
    const items = buildTickerItems(ctxOf(sem([]), MON(11)))
    expect(items).toHaveLength(1)
    expect(items[0]?.category).toBe('no_courses')
    expect(items[0]?.badge).toBe('SETUP')
    expect(TICKER_TEMPLATES.no_courses).toContain(items[0]?.text)
  })

  it('includes a no_schedule nudge when no course has schedule slots', () => {
    const items = buildTickerItems(ctxOf(sem([course()]), MON(11)))
    const item = find(items, 'no_schedule')
    expect(item?.badge).toBe('SETUP')
    expect(item?.priority).toBe(2)
    expect(item?.target).toEqual({ type: 'none' })
  })
})

describe('buildTickerItems — class detection', () => {
  const withSlot = () => sem([course({ schedule: [{ day: 1, start: '10:30', end: '12:30' }] })])

  it('flags a class in session at its exact start time (10:30 => NOW)', () => {
    const item = find(buildTickerItems(ctxOf(withSlot(), MON(10, 30))), 'class_now')
    expect(item?.badge).toBe('NOW')
    expect(item?.priority).toBe(10)
    expect(item?.target).toEqual({ type: 'course', courseId: 'c1' })
  })

  it('does not flag a class at its exact end time (12:30 => not NOW)', () => {
    expect(find(buildTickerItems(ctxOf(withSlot(), MON(12, 30))), 'class_now')).toBeUndefined()
  })

  it('still flags the class one minute before it ends', () => {
    expect(find(buildTickerItems(ctxOf(withSlot(), MON(12, 29))), 'class_now')).toBeDefined()
  })

  it('renders class_now text from the catalog with placeholders filled', () => {
    const item = find(buildTickerItems(ctxOf(withSlot(), MON(11, 0))), 'class_now')
    const vars = {
      course: 'Algebra',
      courseMaybe: ' (Algebra)',
      start: '10:30',
      end: '12:30',
      location: '',
    }
    expect(TICKER_TEMPLATES.class_now.map((t) => fill(t, vars))).toContain(item?.text)
  })

  it('uses class_soon within 15 minutes of the start', () => {
    const item = find(buildTickerItems(ctxOf(withSlot(), MON(10, 15))), 'class_soon')
    expect(item?.badge).toBe('NEXT')
    expect(item?.priority).toBe(9)
    expect(find(buildTickerItems(ctxOf(withSlot(), MON(10, 15))), 'class_next')).toBeUndefined()
  })

  it('uses class_next when the next class is more than 15 minutes away', () => {
    const item = find(buildTickerItems(ctxOf(withSlot(), MON(8, 0))), 'class_next')
    expect(item?.badge).toBe('NEXT')
    expect(item?.priority).toBe(9)
    expect(item?.target).toEqual({ type: 'course', courseId: 'c1' })
  })

  it('shows both the live class and the next one on a two-slot day', () => {
    const s = sem([
      course({
        schedule: [
          { day: 1, start: '10:30', end: '12:30' },
          { day: 1, start: '14:00', end: '16:00' },
        ],
      }),
    ])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    expect(find(items, 'class_now')).toBeDefined()
    expect(find(items, 'class_next')).toBeDefined()
  })

  it('handles overnight slots (23:00-01:00 is live at 23:30)', () => {
    const s = sem([course({ schedule: [{ day: 1, start: '23:00', end: '01:00' }] })])
    const items = buildTickerItems(ctxOf(s, MON(23, 30)))
    expect(find(items, 'class_now')).toBeDefined()
    // urgent class suppresses the late-night vibe
    expect(find(items, 'late_night')).toBeUndefined()
  })

  it('announces tomorrow morning class when nothing is left today (badge SOON)', () => {
    const s = sem([course({ schedule: [{ day: 2, start: '09:30', end: '11:30' }] })])
    const item = find(buildTickerItems(ctxOf(s, MON(11))), 'class_tomorrow')
    expect(item?.badge).toBe('SOON')
    expect(item?.priority).toBe(4)
    expect(item?.target).toEqual({ type: 'course', courseId: 'c1' })
  })

  it('suppresses class_tomorrow while a class is still scheduled today', () => {
    const s = sem([
      course({
        schedule: [
          { day: 1, start: '14:00', end: '16:00' },
          { day: 2, start: '09:30', end: '11:30' },
        ],
      }),
    ])
    expect(find(buildTickerItems(ctxOf(s, MON(11))), 'class_tomorrow')).toBeUndefined()
  })

  it('flags a free day (no_classes_today) when schedule exists elsewhere', () => {
    const s = sem([course({ schedule: [{ day: 2, start: '09:30', end: '11:30' }] })])
    const item = find(buildTickerItems(ctxOf(s, MON(11))), 'no_classes_today')
    expect(item?.badge).toBe('FREE')
    expect(item?.priority).toBe(3)
  })

  it('does not flag a free day when there is no schedule at all', () => {
    const items = buildTickerItems(ctxOf(sem([course()]), MON(11)))
    expect(find(items, 'no_classes_today')).toBeUndefined()
    expect(find(items, 'no_schedule')).toBeDefined()
  })

  it('does not flag a free day late at night', () => {
    const s = sem([course({ schedule: [{ day: 2, start: '09:30', end: '11:30' }] })])
    expect(find(buildTickerItems(ctxOf(s, MON(23, 30))), 'no_classes_today')).toBeUndefined()
  })
})

describe('buildTickerItems — homework buckets', () => {
  const semWith = (...hws: unknown[]) => sem([course({ homework: hws })])

  it('flags overdue homework with badge HW!! and priority 8', () => {
    const item = find(
      buildTickerItems(ctxOf(semWith(hw('h1', '2026-03-01')), MON(11))),
      'hw_overdue',
    )
    expect(item?.badge).toBe('HW!!')
    expect(item?.priority).toBe(8)
    expect(item?.target).toEqual({ type: 'homework', courseId: 'c1', homeworkId: 'h1' })
    expect(item?.text).toContain('HW h1')
  })

  it('flags homework due today (hw_today, badge HW!)', () => {
    const item = find(buildTickerItems(ctxOf(semWith(hw('h1', '2026-03-02')), MON(11))), 'hw_today')
    expect(item?.badge).toBe('HW!')
    expect(item?.priority).toBe(8)
  })

  it('flags homework due tomorrow (hw_tomorrow, badge HW!)', () => {
    const item = find(
      buildTickerItems(ctxOf(semWith(hw('h1', '2026-03-03')), MON(11))),
      'hw_tomorrow',
    )
    expect(item?.badge).toBe('HW!')
  })

  it('flags homework due in exactly 7 days as hw_soon (badge HW)', () => {
    const item = find(buildTickerItems(ctxOf(semWith(hw('h1', '2026-03-09')), MON(11))), 'hw_soon')
    expect(item?.badge).toBe('HW')
  })

  it('ignores homework due more than 7 days out', () => {
    const items = buildTickerItems(ctxOf(semWith(hw('h1', '2026-03-10')), MON(11)))
    expect(cats(items)).not.toContain('hw_soon')
    expect(cats(items).filter((c) => c.startsWith('hw_'))).toHaveLength(0)
  })

  it('skips completed homework entirely', () => {
    const items = buildTickerItems(ctxOf(semWith(hw('h1', '2026-03-01', true)), MON(11)))
    expect(find(items, 'hw_overdue')).toBeUndefined()
  })

  it('picks at most two urgent homeworks, preferring a different course for the second', () => {
    const s = sem([
      course({ id: 'c1', homework: [hw('h1', '2026-03-01'), hw('h2', '2026-03-02')] }),
      course({ id: 'c2', name: 'Physics', homework: [hw('h3', '2026-03-03')] }),
    ])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    expect(find(items, 'hw_overdue')?.priority).toBe(8)
    expect(find(items, 'hw_overdue')?.target.courseId).toBe('c1')
    expect(find(items, 'hw_tomorrow')?.priority).toBe(7)
    expect(find(items, 'hw_tomorrow')?.target.courseId).toBe('c2')
    expect(find(items, 'hw_today')).toBeUndefined()
  })

  it('falls back to the same course for the second pick when necessary', () => {
    const s = semWith(hw('h1', '2026-03-01'), hw('h2', '2026-03-02'))
    const items = buildTickerItems(ctxOf(s, MON(11)))
    expect(find(items, 'hw_overdue')?.priority).toBe(8)
    expect(find(items, 'hw_today')?.priority).toBe(7)
  })

  it('nudges about homework without a due date', () => {
    const item = find(buildTickerItems(ctxOf(semWith(hw('h1', '')), MON(11))), 'hw_nodate')
    expect(item?.badge).toBe('HW')
    expect(item?.priority).toBe(3)
    expect(item?.target).toEqual({ type: 'homework', courseId: 'c1', homeworkId: 'h1' })
  })

  it('flags a pile of 6+ incomplete homeworks (hw_many)', () => {
    const pile = Array.from({ length: 6 }, (_, i) => hw(`h${i}`, '2026-05-01'))
    const item = find(buildTickerItems(ctxOf(semWith(...pile), MON(11))), 'hw_many')
    expect(item?.badge).toBe('HW+')
    expect(item?.priority).toBe(5)
    expect(item?.text).toContain('6')
  })

  it('does not flag hw_many for 5 incomplete homeworks', () => {
    const pile = Array.from({ length: 5 }, (_, i) => hw(`h${i}`, '2026-05-01'))
    expect(find(buildTickerItems(ctxOf(semWith(...pile), MON(11))), 'hw_many')).toBeUndefined()
  })

  it('celebrates when every homework is done (hw_all_done)', () => {
    const items = buildTickerItems(
      ctxOf(semWith(hw('h1', '2026-03-01', true), hw('h2', '', true)), MON(11)),
    )
    const item = find(items, 'hw_all_done')
    expect(item?.badge).toBe('NICE')
    expect(item?.priority).toBe(2)
  })
})

describe('buildTickerItems — exams', () => {
  const semWithExams = (moedA: string, moedB = '') => sem([course({ exams: { moedA, moedB } })])

  it('flags an exam today with EXAM!! and priority 9', () => {
    const item = find(buildTickerItems(ctxOf(semWithExams('2026-03-02'), MON(11))), 'exam_today')
    expect(item?.badge).toBe('EXAM!!')
    expect(item?.priority).toBe(9)
    expect(item?.target).toEqual({ type: 'exam', courseId: 'c1' })
  })

  it('flags an exam tomorrow with EXAM!', () => {
    const item = find(buildTickerItems(ctxOf(semWithExams('2026-03-03'), MON(11))), 'exam_tomorrow')
    expect(item?.badge).toBe('EXAM!')
  })

  it('flags an exam within 3 days as exam_soon (EXAM!)', () => {
    const item = find(buildTickerItems(ctxOf(semWithExams('2026-03-05'), MON(11))), 'exam_soon')
    expect(item?.badge).toBe('EXAM!')
  })

  it('flags an exam within 14 days as exam (EXAM)', () => {
    const ten = find(buildTickerItems(ctxOf(semWithExams('2026-03-12'), MON(11))), 'exam')
    expect(ten?.badge).toBe('EXAM')
    const fourteen = find(buildTickerItems(ctxOf(semWithExams('2026-03-16'), MON(11))), 'exam')
    expect(fourteen?.badge).toBe('EXAM')
  })

  it('ignores exams more than 14 days away and past exams', () => {
    const far = buildTickerItems(ctxOf(semWithExams('2026-03-17'), MON(11)))
    expect(cats(far).some((c) => c.startsWith('exam'))).toBe(false)
    const past = buildTickerItems(ctxOf(semWithExams('2026-03-01'), MON(11)))
    expect(cats(past).some((c) => c.startsWith('exam'))).toBe(false)
  })

  it('reads moed B dates too', () => {
    const item = find(buildTickerItems(ctxOf(semWithExams('', '2026-03-05'), MON(11))), 'exam_soon')
    expect(item).toBeDefined()
  })

  it('shows a single exam item and always prefers an exam happening today', () => {
    const s = sem([
      course({ id: 'c1', exams: { moedA: '2026-03-02', moedB: '' } }),
      course({ id: 'c2', name: 'Physics', exams: { moedA: '2026-03-07', moedB: '' } }),
    ])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    const examCats = cats(items).filter((c) => c.startsWith('exam'))
    expect(examCats).toEqual(['exam_today'])
    expect(find(items, 'exam_today')?.target.courseId).toBe('c1')
  })
})

describe('buildTickerItems — recordings', () => {
  it('flags a small unwatched backlog (REC, priority 4)', () => {
    const s = sem([course({ recordings: recTabs(3) })])
    const item = find(buildTickerItems(ctxOf(s, MON(11))), 'recordings_backlog')
    expect(item?.badge).toBe('REC')
    expect(item?.priority).toBe(4)
    expect(item?.target).toEqual({ type: 'recordings', courseId: 'c1' })
    expect(item?.text).toContain('3')
  })

  it('flags 10+ unwatched recordings as recordings_big (REC!)', () => {
    const s = sem([course({ recordings: recTabs(12) })])
    const item = find(buildTickerItems(ctxOf(s, MON(11))), 'recordings_big')
    expect(item?.badge).toBe('REC!')
    expect(item?.text).toContain('12')
  })

  it('picks the course with the biggest backlog', () => {
    const s = sem([
      course({ id: 'c1', recordings: recTabs(3) }),
      course({ id: 'c2', name: 'Physics', recordings: recTabs(5) }),
    ])
    const item = find(buildTickerItems(ctxOf(s, MON(11))), 'recordings_backlog')
    expect(item?.target.courseId).toBe('c2')
    expect(item?.text).toContain('5')
  })

  it('only counts unwatched items', () => {
    const s = sem([course({ recordings: recTabs(1, 2) })])
    const item = find(buildTickerItems(ctxOf(s, MON(11))), 'recordings_backlog')
    expect(item?.text).toContain('1')
  })

  it('celebrates a fully watched catalog (recordings_clear)', () => {
    const s = sem([course({ recordings: recTabs(0, 2) })])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    const item = find(items, 'recordings_clear')
    expect(item?.badge).toBe('NICE')
    expect(item?.priority).toBe(2)
  })
})

describe('buildTickerItems — all-clear and positive states', () => {
  it('adds all_clear when nothing is actionable', () => {
    const items = buildTickerItems(ctxOf(sem([course()]), MON(11)))
    const item = find(items, 'all_clear')
    expect(item?.badge).toBe('OK')
    expect(item?.priority).toBe(2)
    expect(TICKER_TEMPLATES.all_clear).toContain(item?.text)
  })

  it('suppresses all_clear and positive states when homework is urgent', () => {
    const s = sem([course({ homework: [hw('h1', '2026-03-01')] })])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    expect(find(items, 'all_clear')).toBeUndefined()
    expect(find(items, 'hw_all_done')).toBeUndefined()
  })

  it('suppresses all_clear when an exam is coming', () => {
    const s = sem([course({ exams: { moedA: '2026-03-07', moedB: '' } })])
    expect(find(buildTickerItems(ctxOf(s, MON(11))), 'all_clear')).toBeUndefined()
  })

  it('suppresses positive states while a class is live', () => {
    const s = sem([
      course({
        schedule: [{ day: 1, start: '10:30', end: '12:30' }],
        homework: [hw('h1', '2026-03-01', true)],
      }),
    ])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    expect(find(items, 'hw_all_done')).toBeUndefined()
    expect(find(items, 'all_clear')).toBeUndefined()
  })
})

describe('buildTickerItems — time-of-day vibes', () => {
  it('shows the late-night vibe between 23:00 and 04:59', () => {
    for (const now of [MON(23, 30), MON(0, 30), MON(4, 59)]) {
      const item = find(buildTickerItems(ctxOf(sem([course()]), now)), 'late_night')
      expect(item?.badge).toBe('ZZZ')
      expect(item?.priority).toBe(3)
    }
  })

  it('does not show late-night at 22:59 or 05:00', () => {
    expect(
      find(buildTickerItems(ctxOf(sem([course()]), MON(22, 59))), 'late_night'),
    ).toBeUndefined()
    expect(find(buildTickerItems(ctxOf(sem([course()]), MON(5, 0))), 'late_night')).toBeUndefined()
  })

  it('shows the morning vibe from 05:00 to 09:59 on a weekday', () => {
    const nine = find(buildTickerItems(ctxOf(sem([course()]), MON(9, 59))), 'morning')
    expect(nine?.badge).toBe('AM')
    expect(nine?.priority).toBe(1)
    const five = find(buildTickerItems(ctxOf(sem([course()]), MON(5, 0))), 'morning')
    expect(five).toBeDefined()
    expect(find(buildTickerItems(ctxOf(sem([course()]), MON(10, 0))), 'morning')).toBeUndefined()
  })

  it('shows the weekend vibe on Saturday, Friday evening, and Sunday daytime', () => {
    const sat = new Date(2026, 2, 7, 12, 0)
    const friEve = new Date(2026, 2, 6, 18, 0)
    const sunNoon = new Date(2026, 2, 8, 12, 0)
    for (const now of [sat, friEve, sunNoon]) {
      const item = find(buildTickerItems(ctxOf(sem([course()]), now)), 'weekend')
      expect(item?.badge).toBe('WEEKEND')
      expect(item?.priority).toBe(2)
    }
  })

  it('does not show the weekend vibe on Friday afternoon or Sunday evening', () => {
    const friDay = new Date(2026, 2, 6, 16, 0)
    const sunEve = new Date(2026, 2, 8, 19, 0)
    expect(find(buildTickerItems(ctxOf(sem([course()]), friDay)), 'weekend')).toBeUndefined()
    expect(find(buildTickerItems(ctxOf(sem([course()]), sunEve)), 'weekend')).toBeUndefined()
  })

  it('suppresses vibes when something urgent is on', () => {
    const s = sem([course({ homework: [hw('h1', '2026-03-01')] })])
    const items = buildTickerItems(ctxOf(s, MON(9, 0)))
    expect(find(items, 'morning')).toBeUndefined()
  })
})

describe('buildTickerItems — fillers, ordering, determinism', () => {
  it('adds daily fillers (course roast + general) when the list is thin', () => {
    const items = buildTickerItems(ctxOf(sem([course()]), MON(11)))
    const roast = find(items, 'general_course_roast')
    expect(roast?.badge).toBe('VIBE')
    expect(roast?.priority).toBe(1)
    const general = find(items, 'general')
    expect(general?.badge).toBe('NOTE')
    expect(general?.priority).toBe(1)
  })

  it('skips fillers when three or more items already fired', () => {
    const s = sem([
      course({
        schedule: [{ day: 1, start: '10:30', end: '12:30' }],
        homework: [hw('h1', '2026-03-01')],
        exams: { moedA: '2026-03-04', moedB: '' },
        recordings: recTabs(3),
      }),
    ])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    expect(find(items, 'general')).toBeUndefined()
    expect(find(items, 'general_course_roast')).toBeUndefined()
  })

  it('sorts items by priority descending with unique ids and no leftover placeholders', () => {
    const s = sem([
      course({
        schedule: [{ day: 1, start: '10:30', end: '12:30' }],
        homework: [hw('h1', '2026-03-01')],
        exams: { moedA: '2026-03-04', moedB: '' },
        recordings: recTabs(3),
      }),
    ])
    const items = buildTickerItems(ctxOf(s, MON(11)))
    expect(cats(items)).toEqual(['class_now', 'exam_soon', 'hw_overdue', 'recordings_backlog'])
    expect(items.map((i) => i.priority)).toEqual([10, 9, 8, 4])
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    for (const item of items) {
      expect(item.text).not.toMatch(/[{}]/)
      expect(item.text.length).toBeGreaterThan(0)
    }
  })

  it('is deterministic for identical contexts', () => {
    const build = () =>
      buildTickerItems(
        ctxOf(
          sem([
            course({
              schedule: [{ day: 1, start: '10:30', end: '12:30' }],
              homework: [hw('h1', '2026-03-04')],
            }),
          ]),
          MON(11),
        ),
      )
    expect(build()).toEqual(build())
  })

  it('keeps the same texts within a 15-minute bucket', () => {
    const quiet = () => sem([course()])
    const a = buildTickerItems(ctxOf(quiet(), MON(11, 0)))
    const b = buildTickerItems(ctxOf(quiet(), MON(11, 14)))
    expect(a).toEqual(b)
  })
})

describe('pickTickerItem', () => {
  const mk = (id: string, priority = 1): TickerItem => ({
    id,
    category: 'general',
    priority,
    badge: 'NOTE',
    text: id,
    target: { type: 'none' },
  })

  it('returns null for an empty list', () => {
    expect(pickTickerItem([], { seed: 1, recentIds: [] })).toBeNull()
  })

  it('is deterministic for a given seed', () => {
    const items = [mk('a'), mk('b'), mk('c'), mk('d')]
    for (const seed of [0, 1, 7, 42, 1234567]) {
      expect(pickTickerItem(items, { seed, recentIds: [] })?.id).toBe(
        pickTickerItem(items, { seed, recentIds: [] })?.id,
      )
    }
  })

  it('varies across seeds', () => {
    const items = [mk('a'), mk('b'), mk('c'), mk('d')]
    const picked = new Set<string>()
    for (let seed = 0; seed < 64; seed++) {
      const item = pickTickerItem(items, { seed, recentIds: [] })
      if (item) picked.add(item.id)
    }
    expect(picked.size).toBeGreaterThan(1)
  })

  it('never picks a recently shown item while alternatives exist', () => {
    const items = [mk('a'), mk('b'), mk('c')]
    for (let seed = 0; seed < 60; seed++) {
      expect(pickTickerItem(items, { seed, recentIds: ['a', 'b'] })?.id).toBe('c')
    }
  })

  it('falls back to the full pool when everything is recent', () => {
    const items = [mk('a'), mk('b')]
    const item = pickTickerItem(items, { seed: 3, recentIds: ['a', 'b'] })
    expect(item).not.toBeNull()
  })

  it('weights picks by priority', () => {
    const items = [mk('high', 3), mk('low', 1)]
    let high = 0
    let low = 0
    for (let seed = 0; seed < 800; seed++) {
      const item = pickTickerItem(items, { seed, recentIds: [] })
      if (item?.id === 'high') high++
      else low++
    }
    expect(high).toBeGreaterThan(low * 1.5)
  })

  it('caps the priority weight (legacy cap of 3)', () => {
    const items = [mk('huge', 99), mk('tiny', 1)]
    let tiny = 0
    for (let seed = 0; seed < 800; seed++) {
      if (pickTickerItem(items, { seed, recentIds: [] })?.id === 'tiny') tiny++
    }
    // With a 3:1 cap tiny should land ~200/800; without the cap it would be ~8.
    expect(tiny).toBeGreaterThan(100)
  })
})
