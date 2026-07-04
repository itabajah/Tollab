import {
  ROWS_PER_HOUR,
  collectWeekEvents,
  dayColumnIndex,
  gridRowCount,
  hasWeekEvents,
  hourLabels,
  layoutWeek,
  nowIndicator,
  positionSlot,
  type GridConfig,
} from './calendar'
import { courseSchema, type Course } from './model'

const cfg: GridConfig = { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] }

function makeCourse(overrides: Record<string, unknown> = {}): Course {
  return courseSchema.parse({
    id: 'c1',
    name: 'Algebra',
    color: '#ff0000',
    ...overrides,
  })
}

// 2026-07-01 is a Wednesday (day 3); its week is Sun 2026-06-28 .. Sat 2026-07-04.
const wednesday = (h: number, m: number) => new Date(2026, 6, 1, h, m)

describe('ROWS_PER_HOUR / gridRowCount', () => {
  it('is 12 rows per hour (5-minute resolution)', () => {
    expect(ROWS_PER_HOUR).toBe(12)
  })

  it('counts rows across the visible hour range', () => {
    expect(gridRowCount(cfg)).toBe(144)
    expect(gridRowCount({ ...cfg, startHour: 0, endHour: 24 })).toBe(288)
    expect(gridRowCount({ ...cfg, startHour: 9, endHour: 10 })).toBe(12)
  })
})

describe('hourLabels', () => {
  it('labels every hour line including start, excluding end', () => {
    const labels = hourLabels(cfg)
    expect(labels).toHaveLength(12)
    expect(labels[0]).toBe('08:00')
    expect(labels[labels.length - 1]).toBe('19:00')
  })

  it('zero-pads single-digit hours', () => {
    expect(hourLabels({ ...cfg, startHour: 7, endHour: 10 })).toEqual(['07:00', '08:00', '09:00'])
  })

  it('handles a one-hour grid', () => {
    expect(hourLabels({ ...cfg, startHour: 9, endHour: 10 })).toEqual(['09:00'])
  })
})

describe('dayColumnIndex', () => {
  it('returns the index within visibleDays', () => {
    expect(dayColumnIndex(0, cfg)).toBe(0)
    expect(dayColumnIndex(3, cfg)).toBe(3)
    expect(dayColumnIndex(5, cfg)).toBe(5)
  })

  it('returns null for hidden days', () => {
    expect(dayColumnIndex(6, cfg)).toBeNull()
    expect(dayColumnIndex(0, { ...cfg, visibleDays: [1, 2] })).toBeNull()
  })

  it('respects the visibleDays ordering, not the day number', () => {
    const reordered: GridConfig = { ...cfg, visibleDays: [3, 0, 5] }
    expect(dayColumnIndex(3, reordered)).toBe(0)
    expect(dayColumnIndex(0, reordered)).toBe(1)
    expect(dayColumnIndex(5, reordered)).toBe(2)
  })
})

describe('positionSlot', () => {
  it('positions a slot at the top-left of the grid', () => {
    expect(positionSlot({ day: 0, start: '08:00', end: '09:00' }, cfg)).toEqual({
      column: 0,
      rowStart: 1,
      rowSpan: 12,
    })
  })

  it('computes 5-minute rows (10:35 => row 32)', () => {
    expect(positionSlot({ day: 2, start: '10:35', end: '11:40' }, cfg)).toEqual({
      column: 2,
      rowStart: 32,
      rowSpan: 13,
    })
  })

  it('returns null for hidden days even when the hours are visible', () => {
    expect(positionSlot({ day: 6, start: '10:00', end: '11:00' }, cfg)).toBeNull()
  })

  it('clamps a slot that starts before startHour', () => {
    expect(positionSlot({ day: 1, start: '07:00', end: '09:00' }, cfg)).toEqual({
      column: 1,
      rowStart: 1,
      rowSpan: 12,
    })
  })

  it('clamps a slot that ends after endHour', () => {
    expect(positionSlot({ day: 1, start: '19:30', end: '21:00' }, cfg)).toEqual({
      column: 1,
      rowStart: 139,
      rowSpan: 6,
    })
  })

  it('clamps a slot spanning the whole grid to the full row range', () => {
    expect(positionSlot({ day: 0, start: '07:00', end: '21:00' }, cfg)).toEqual({
      column: 0,
      rowStart: 1,
      rowSpan: 144,
    })
  })

  it('returns null when the slot lies fully before the visible hours', () => {
    expect(positionSlot({ day: 0, start: '06:00', end: '07:30' }, cfg)).toBeNull()
    // Ending exactly at startHour still counts as outside.
    expect(positionSlot({ day: 0, start: '06:00', end: '08:00' }, cfg)).toBeNull()
  })

  it('returns null when the slot lies fully after the visible hours', () => {
    expect(positionSlot({ day: 0, start: '21:00', end: '22:00' }, cfg)).toBeNull()
    // Starting exactly at endHour still counts as outside.
    expect(positionSlot({ day: 0, start: '20:00', end: '22:00' }, cfg)).toBeNull()
  })

  it('fits a slot ending exactly at endHour without clamping', () => {
    expect(positionSlot({ day: 4, start: '19:00', end: '20:00' }, cfg)).toEqual({
      column: 4,
      rowStart: 133,
      rowSpan: 12,
    })
  })

  it('rounds non-5-minute times outward (floor start, ceil end)', () => {
    // 10:32-10:33 covers the single 10:30-10:35 row.
    expect(positionSlot({ day: 0, start: '10:32', end: '10:33' }, cfg)).toEqual({
      column: 0,
      rowStart: 31,
      rowSpan: 1,
    })
    // 10:32-10:38 covers 10:30-10:40 (rows 31-32).
    expect(positionSlot({ day: 0, start: '10:32', end: '10:38' }, cfg)).toEqual({
      column: 0,
      rowStart: 31,
      rowSpan: 2,
    })
  })

  it('gives degenerate zero-length slots a minimum span of 1', () => {
    expect(positionSlot({ day: 0, start: '10:00', end: '10:00' }, cfg)).toEqual({
      column: 0,
      rowStart: 25,
      rowSpan: 1,
    })
  })

  it('maps the column through the visibleDays order', () => {
    const reordered: GridConfig = { ...cfg, visibleDays: [3, 0] }
    expect(positionSlot({ day: 0, start: '09:00', end: '10:00' }, reordered)).toMatchObject({
      column: 1,
    })
  })

  it('returns null for an empty (degenerate) hour range', () => {
    expect(
      positionSlot(
        { day: 0, start: '09:00', end: '11:00' },
        { ...cfg, startHour: 10, endHour: 10 },
      ),
    ).toBeNull()
  })
})

describe('layoutWeek', () => {
  it('returns an empty layout for no courses', () => {
    expect(layoutWeek([], cfg)).toEqual([])
  })

  it('carries course metadata onto each positioned slot', () => {
    const course = makeCourse({
      id: 'math',
      name: 'Calculus',
      color: '#00ff00',
      location: 'Ullman 305',
      schedule: [{ day: 2, start: '10:00', end: '12:00' }],
    })
    expect(layoutWeek([course], cfg)).toEqual([
      {
        courseId: 'math',
        courseName: 'Calculus',
        color: '#00ff00',
        location: 'Ullman 305',
        day: 2,
        column: 2,
        rowStart: 25,
        rowSpan: 24,
        start: '10:00',
        end: '12:00',
        lane: 0,
        laneCount: 1,
      },
    ])
  })

  it('skips slots on hidden days and slots fully outside the visible hours', () => {
    const course = makeCourse({
      schedule: [
        { day: 6, start: '10:00', end: '11:00' },
        { day: 0, start: '06:00', end: '07:00' },
        { day: 0, start: '10:00', end: '11:00' },
      ],
    })
    const laid = layoutWeek([course], cfg)
    expect(laid).toHaveLength(1)
    expect(laid[0]).toMatchObject({ day: 0, rowStart: 25 })
  })

  it('keeps slots on different days in separate columns with no lanes', () => {
    const course = makeCourse({
      schedule: [
        { day: 0, start: '10:00', end: '11:00' },
        { day: 1, start: '10:00', end: '11:00' },
      ],
    })
    const laid = layoutWeek([course], cfg)
    expect(laid.map((s) => ({ column: s.column, lane: s.lane, laneCount: s.laneCount }))).toEqual([
      { column: 0, lane: 0, laneCount: 1 },
      { column: 1, lane: 0, laneCount: 1 },
    ])
  })

  it('treats back-to-back slots (touching ranges) as non-overlapping', () => {
    const course = makeCourse({
      schedule: [
        { day: 0, start: '09:00', end: '10:00' },
        { day: 0, start: '10:00', end: '11:00' },
      ],
    })
    const laid = layoutWeek([course], cfg)
    expect(laid.every((s) => s.lane === 0 && s.laneCount === 1)).toBe(true)
  })

  it('splits a 2-slot overlap into two lanes', () => {
    const a = makeCourse({ id: 'a', schedule: [{ day: 0, start: '09:00', end: '11:00' }] })
    const b = makeCourse({ id: 'b', schedule: [{ day: 0, start: '10:00', end: '12:00' }] })
    const laid = layoutWeek([a, b], cfg)
    const byId = (id: string) => laid.find((s) => s.courseId === id)
    expect(byId('a')).toMatchObject({ lane: 0, laneCount: 2 })
    expect(byId('b')).toMatchObject({ lane: 1, laneCount: 2 })
  })

  it('splits a 3-way concurrent overlap into three lanes', () => {
    const course = makeCourse({
      schedule: [
        { day: 1, start: '09:00', end: '12:00' },
        { day: 1, start: '09:30', end: '12:00' },
        { day: 1, start: '10:00', end: '12:00' },
      ],
    })
    const laid = layoutWeek([course], cfg)
    expect(laid.map((s) => s.lane).sort()).toEqual([0, 1, 2])
    expect(laid.every((s) => s.laneCount === 3)).toBe(true)
  })

  it('gives a chain A-B-C (A,C overlap B but not each other) laneCount 2, reusing lane 0 for C', () => {
    // Greedy interval partitioning: laneCount is the max number of concurrent
    // lanes in the overlap cluster, not the cluster size.
    const a = makeCourse({ id: 'a', schedule: [{ day: 0, start: '09:00', end: '10:00' }] })
    const b = makeCourse({ id: 'b', schedule: [{ day: 0, start: '09:30', end: '10:30' }] })
    const c = makeCourse({ id: 'c', schedule: [{ day: 0, start: '10:00', end: '11:00' }] })
    const laid = layoutWeek([a, b, c], cfg)
    const byId = (id: string) => laid.find((s) => s.courseId === id)
    expect(byId('a')).toMatchObject({ lane: 0, laneCount: 2 })
    expect(byId('b')).toMatchObject({ lane: 1, laneCount: 2 })
    expect(byId('c')).toMatchObject({ lane: 0, laneCount: 2 })
  })

  it('resolves clusters independently within the same column', () => {
    const course = makeCourse({
      schedule: [
        { day: 2, start: '09:00', end: '10:00' },
        { day: 2, start: '09:30', end: '10:30' },
        { day: 2, start: '12:00', end: '13:00' },
      ],
    })
    const laid = layoutWeek([course], cfg)
    const late = laid.find((s) => s.start === '12:00')
    expect(late).toMatchObject({ lane: 0, laneCount: 1 })
    expect(laid.filter((s) => s.start !== '12:00').every((s) => s.laneCount === 2)).toBe(true)
  })

  it('does not lane-split identical times on different days', () => {
    const a = makeCourse({ id: 'a', schedule: [{ day: 0, start: '09:00', end: '11:00' }] })
    const b = makeCourse({ id: 'b', schedule: [{ day: 1, start: '09:00', end: '11:00' }] })
    const laid = layoutWeek([a, b], cfg)
    expect(laid.every((s) => s.lane === 0 && s.laneCount === 1)).toBe(true)
  })

  it('assigns lanes deterministically for identical start times (input order)', () => {
    const a = makeCourse({ id: 'a', schedule: [{ day: 0, start: '09:00', end: '10:00' }] })
    const b = makeCourse({ id: 'b', schedule: [{ day: 0, start: '09:00', end: '10:00' }] })
    const laid = layoutWeek([a, b], cfg)
    const byId = (id: string) => laid.find((s) => s.courseId === id)
    expect(byId('a')).toMatchObject({ lane: 0, laneCount: 2 })
    expect(byId('b')).toMatchObject({ lane: 1, laneCount: 2 })
  })
})

describe('nowIndicator', () => {
  it('places the line at the fractional position within the whole grid', () => {
    expect(nowIndicator(wednesday(14, 0), cfg)).toEqual({ column: 3, rowFraction: 0.5 })
  })

  it('returns fraction 0 exactly at startHour', () => {
    expect(nowIndicator(wednesday(8, 0), cfg)).toEqual({ column: 3, rowFraction: 0 })
  })

  it('accounts for minutes', () => {
    const result = nowIndicator(wednesday(8, 30), cfg)
    expect(result?.rowFraction).toBeCloseTo(30 / 720, 10)
  })

  it('is visible up to (but excluding) endHour', () => {
    const result = nowIndicator(wednesday(19, 59), cfg)
    expect(result?.rowFraction).toBeCloseTo(719 / 720, 10)
    expect(nowIndicator(wednesday(20, 0), cfg)).toBeNull()
  })

  it('returns null before startHour', () => {
    expect(nowIndicator(wednesday(7, 59), cfg)).toBeNull()
  })

  it('returns null when today is not a visible day', () => {
    // 2026-07-04 is a Saturday (day 6), hidden under the default visibleDays.
    expect(nowIndicator(new Date(2026, 6, 4, 14, 0), cfg)).toBeNull()
  })

  it('maps the column through the visibleDays order', () => {
    const reordered: GridConfig = { ...cfg, visibleDays: [3, 0] }
    expect(nowIndicator(wednesday(14, 0), reordered)).toEqual({ column: 0, rowFraction: 0.5 })
  })
})

describe('collectWeekEvents', () => {
  const now = wednesday(12, 0)

  it('collects homework due this week with course metadata', () => {
    const course = makeCourse({
      id: 'phys',
      name: 'Physics',
      color: '#0000ff',
      homework: [
        { id: 'hw1', title: 'Problem set 3', dueDate: '2026-07-01', completed: true },
        { id: 'hw2', title: 'Next week', dueDate: '2026-07-06' },
        { id: 'hw3', title: 'No due date', dueDate: '' },
      ],
    })
    expect(collectWeekEvents([course], now, cfg)).toEqual([
      {
        day: 3,
        column: 3,
        date: '2026-07-01',
        kind: 'homework',
        courseId: 'phys',
        courseName: 'Physics',
        color: '#0000ff',
        title: 'Problem set 3',
        completed: true,
        homeworkId: 'hw1',
      },
    ])
  })

  it('collects moed A and moed B exams falling in the current week', () => {
    const course = makeCourse({
      id: 'algo',
      name: 'Algorithms',
      color: '#123456',
      exams: { moedA: '2026-06-29', moedB: '2026-07-02' },
    })
    const events = collectWeekEvents([course], now, cfg)
    expect(events).toEqual([
      {
        day: 1,
        column: 1,
        date: '2026-06-29',
        kind: 'exam',
        courseId: 'algo',
        courseName: 'Algorithms',
        color: '#123456',
        title: 'Algorithms Moed A',
        completed: false,
        moed: 'A',
      },
      {
        day: 4,
        column: 4,
        date: '2026-07-02',
        kind: 'exam',
        courseId: 'algo',
        courseName: 'Algorithms',
        color: '#123456',
        title: 'Algorithms Moed B',
        completed: false,
        moed: 'B',
      },
    ])
  })

  it('excludes exams outside the current week and unset exam dates', () => {
    const course = makeCourse({ exams: { moedA: '2026-07-10', moedB: '' } })
    expect(collectWeekEvents([course], now, cfg)).toEqual([])
  })

  it('skips events on days that are not visible', () => {
    // 2026-07-04 is Saturday (day 6), hidden by default.
    const course = makeCourse({
      exams: { moedA: '2026-07-04' },
      homework: [{ id: 'hw1', title: 'Weekend work', dueDate: '2026-07-04' }],
    })
    expect(collectWeekEvents([course], now, cfg)).toEqual([])
    expect(
      collectWeekEvents([course], now, { ...cfg, visibleDays: [0, 1, 2, 3, 4, 5, 6] }),
    ).toHaveLength(2)
  })

  it('sorts by date, with exams before homework on the same day', () => {
    const hwCourse = makeCourse({
      id: 'first',
      name: 'First Course',
      homework: [
        { id: 'hw-mon', title: 'Monday HW', dueDate: '2026-06-29' },
        { id: 'hw-sun', title: 'Sunday HW', dueDate: '2026-06-28' },
      ],
    })
    const examCourse = makeCourse({
      id: 'second',
      name: 'Second Course',
      exams: { moedA: '2026-06-29' },
    })
    const events = collectWeekEvents([hwCourse, examCourse], now, cfg)
    expect(events.map((e) => [e.date, e.kind])).toEqual([
      ['2026-06-28', 'homework'],
      ['2026-06-29', 'exam'],
      ['2026-06-29', 'homework'],
    ])
  })

  it('keeps insertion order among same-day events of the same kind', () => {
    const a = makeCourse({
      id: 'a',
      homework: [
        { id: 'hw1', title: 'First', dueDate: '2026-06-30' },
        { id: 'hw2', title: 'Second', dueDate: '2026-06-30' },
      ],
    })
    const b = makeCourse({
      id: 'b',
      homework: [{ id: 'hw3', title: 'Third', dueDate: '2026-06-30' }],
    })
    const events = collectWeekEvents([a, b], now, cfg)
    expect(events.map((e) => e.title)).toEqual(['First', 'Second', 'Third'])
  })

  it('maps event columns through the visibleDays order', () => {
    const course = makeCourse({
      homework: [{ id: 'hw1', title: 'Sunday HW', dueDate: '2026-06-28' }],
    })
    const events = collectWeekEvents([course], now, { ...cfg, visibleDays: [3, 0] })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ day: 0, column: 1 })
  })

  it('omits homeworkId on exams and moed on homework', () => {
    const course = makeCourse({
      exams: { moedA: '2026-06-29' },
      homework: [{ id: 'hw1', title: 'HW', dueDate: '2026-06-30' }],
    })
    const [exam, hw] = collectWeekEvents([course], now, cfg)
    expect(exam && 'homeworkId' in exam).toBe(false)
    expect(hw && 'moed' in hw).toBe(false)
  })

  it('ignores unparseable dates (regex-valid but not a real day)', () => {
    // '2026-13-45' passes the ymd shape check but rolls over, so parseYmd rejects it.
    const course = makeCourse({
      homework: [{ id: 'hw1', title: 'Broken', dueDate: '2026-13-45' }],
    })
    expect(collectWeekEvents([course], now, cfg)).toEqual([])
  })

  it('returns an empty list for no courses', () => {
    expect(collectWeekEvents([], now, cfg)).toEqual([])
  })
})

describe('hasWeekEvents', () => {
  const now = wednesday(12, 0)

  it('is true when at least one event falls in the visible week', () => {
    const course = makeCourse({
      homework: [{ id: 'hw1', title: 'Due now', dueDate: '2026-07-01' }],
    })
    expect(hasWeekEvents([course], now, cfg)).toBe(true)
  })

  it('is false when there are no events this week', () => {
    const course = makeCourse({
      homework: [{ id: 'hw1', title: 'Far away', dueDate: '2026-08-01' }],
      exams: { moedA: '2026-08-15' },
    })
    expect(hasWeekEvents([course], now, cfg)).toBe(false)
    expect(hasWeekEvents([], now, cfg)).toBe(false)
  })

  it('is false when the only events fall on hidden days', () => {
    const course = makeCourse({ exams: { moedA: '2026-07-04' } })
    expect(hasWeekEvents([course], now, cfg)).toBe(false)
  })
})
