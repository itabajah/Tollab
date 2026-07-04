import type { Course, ScheduleSlot } from '@/domain/model'
import type { Moed } from '@/domain/ids'
import { parseYmd, weekRangeFor } from '@/lib/dates'

/**
 * Pure math for the weekly schedule grid.
 *
 * The grid has one column per visible day (in `visibleDays` order) and
 * `ROWS_PER_HOUR` rows per hour (5-minute resolution) from `startHour` to
 * `endHour`. The React calendar component is a dumb renderer over these
 * results (legacy: renderCalendar in render.js).
 */

export interface GridConfig {
  startHour: number
  endHour: number
  visibleDays: number[]
}

/** 5-minute grid resolution. */
export const ROWS_PER_HOUR = 12

const MINUTES_PER_ROW = 60 / ROWS_PER_HOUR

/** Total number of grid rows between startHour and endHour. */
export function gridRowCount(cfg: GridConfig): number {
  return (cfg.endHour - cfg.startHour) * ROWS_PER_HOUR
}

/** 'HH:00' labels for each hour line, including startHour, excluding endHour. */
export function hourLabels(cfg: GridConfig): string[] {
  const labels: string[] = []
  for (let h = cfg.startHour; h < cfg.endHour; h++) {
    labels.push(`${String(h).padStart(2, '0')}:00`)
  }
  return labels
}

/** Column index of a weekday within visibleDays; null when the day is hidden. */
export function dayColumnIndex(day: number, cfg: GridConfig): number | null {
  const index = cfg.visibleDays.indexOf(day)
  return index === -1 ? null : index
}

export interface PositionedSlot {
  courseId: string
  courseName: string
  color: string
  location: string
  day: number
  column: number
  rowStart: number
  rowSpan: number
  start: string
  end: string
  /** 0-based lane within the column when slots overlap. */
  lane: number
  /** Number of lanes the column is split into for this slot's overlap cluster. */
  laneCount: number
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Grid placement for a single schedule slot. `rowStart` is a 1-based grid row;
 * times are rounded outward to the 5-minute grid (start floored, end ceiled)
 * and clamped into the visible hour range. Returns null when the day is hidden
 * or the slot lies fully outside the visible hours.
 */
export function positionSlot(
  slot: ScheduleSlot,
  cfg: GridConfig,
): { column: number; rowStart: number; rowSpan: number } | null {
  const column = dayColumnIndex(slot.day, cfg)
  if (column === null) return null

  const rowCount = gridRowCount(cfg)
  if (rowCount <= 0) return null

  const gridStart = cfg.startHour * 60
  const gridEnd = cfg.endHour * 60
  const startMin = toMinutes(slot.start)
  const endMin = toMinutes(slot.end)
  if (endMin <= gridStart || startMin >= gridEnd) return null

  const rowStart = clamp(Math.floor((startMin - gridStart) / MINUTES_PER_ROW) + 1, 1, rowCount)
  const rowEnd = clamp(
    Math.ceil((endMin - gridStart) / MINUTES_PER_ROW) + 1,
    rowStart + 1,
    rowCount + 1,
  )
  return { column, rowStart, rowSpan: rowEnd - rowStart }
}

/**
 * Assigns lanes within one column via greedy interval partitioning. Slots are
 * scanned in rowStart order; each takes the first lane that is free at its
 * start row. `laneCount` for every slot in an overlap cluster is the maximum
 * number of concurrent lanes in that cluster (a chain A-B-C where A and C
 * overlap only B yields laneCount 2, with C reusing lane 0).
 */
function assignLanes(columnSlots: PositionedSlot[]): void {
  const sorted = [...columnSlots].sort((a, b) => a.rowStart - b.rowStart)
  const laneEnds: number[] = []
  let cluster: PositionedSlot[] = []
  let clusterEnd = 0

  const closeCluster = () => {
    const laneCount = laneEnds.length
    for (const slot of cluster) slot.laneCount = laneCount
    cluster = []
    laneEnds.length = 0
  }

  for (const slot of sorted) {
    const slotEnd = slot.rowStart + slot.rowSpan
    if (cluster.length > 0 && slot.rowStart >= clusterEnd) closeCluster()

    let lane = laneEnds.findIndex((end) => end <= slot.rowStart)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(slotEnd)
    } else {
      laneEnds[lane] = slotEnd
    }
    slot.lane = lane
    cluster.push(slot)
    clusterEnd = Math.max(clusterEnd, slotEnd)
  }
  closeCluster()
}

/**
 * Positions every schedule slot of every course on the grid (skipping hidden
 * or out-of-range slots) and resolves per-column overlaps into lanes.
 */
export function layoutWeek(courses: readonly Course[], cfg: GridConfig): PositionedSlot[] {
  const positioned: PositionedSlot[] = []
  for (const course of courses) {
    for (const slot of course.schedule) {
      const pos = positionSlot(slot, cfg)
      if (!pos) continue
      positioned.push({
        courseId: course.id,
        courseName: course.name,
        color: course.color,
        location: course.location,
        day: slot.day,
        column: pos.column,
        rowStart: pos.rowStart,
        rowSpan: pos.rowSpan,
        start: slot.start,
        end: slot.end,
        lane: 0,
        laneCount: 1,
      })
    }
  }

  const byColumn = new Map<number, PositionedSlot[]>()
  for (const slot of positioned) {
    const bucket = byColumn.get(slot.column)
    if (bucket) bucket.push(slot)
    else byColumn.set(slot.column, [slot])
  }
  for (const columnSlots of byColumn.values()) assignLanes(columnSlots)

  return positioned
}

/**
 * Position of the current-time line. `rowFraction` is the 0..1 offset within
 * the whole grid. Null when today is hidden or now is outside
 * [startHour, endHour).
 */
export function nowIndicator(
  now: Date,
  cfg: GridConfig,
): { column: number; rowFraction: number } | null {
  const column = dayColumnIndex(now.getDay(), cfg)
  if (column === null) return null

  const minutes = now.getHours() * 60 + now.getMinutes()
  const gridStart = cfg.startHour * 60
  const gridEnd = cfg.endHour * 60
  if (minutes < gridStart || minutes >= gridEnd) return null

  return { column, rowFraction: (minutes - gridStart) / (gridEnd - gridStart) }
}

export interface WeekEvent {
  day: number
  column: number
  date: string
  kind: 'homework' | 'exam'
  courseId: string
  courseName: string
  color: string
  title: string
  completed: boolean
  homeworkId?: string
  moed?: Moed
}

/**
 * Homework due in the current week plus exams (moed A/B) falling in it, on
 * visible days only, sorted by date then kind (exams before homework on the
 * same day; insertion order otherwise).
 */
export function collectWeekEvents(
  courses: readonly Course[],
  now: Date,
  cfg: GridConfig,
): WeekEvent[] {
  const events: WeekEvent[] = []
  const week = weekRangeFor(now)

  const push = (date: string, base: Omit<WeekEvent, 'day' | 'column' | 'date'>) => {
    const parsed = parseYmd(date)
    if (!parsed) return
    if (parsed < week.start || parsed > week.end) return
    const day = parsed.getDay()
    const column = dayColumnIndex(day, cfg)
    if (column === null) return
    events.push({ day, column, date, ...base })
  }

  for (const course of courses) {
    const common = {
      courseId: course.id,
      courseName: course.name,
      color: course.color,
    }
    for (const hw of course.homework) {
      if (!hw.dueDate) continue
      push(hw.dueDate, {
        ...common,
        kind: 'homework',
        title: hw.title,
        completed: hw.completed,
        homeworkId: hw.id,
      })
    }
    for (const moed of ['A', 'B'] as const) {
      const date = moed === 'A' ? course.exams.moedA : course.exams.moedB
      if (!date) continue
      push(date, {
        ...common,
        kind: 'exam',
        title: `${course.name} Moed ${moed}`,
        completed: false,
        moed,
      })
    }
  }

  const kindRank = (event: WeekEvent) => (event.kind === 'exam' ? 0 : 1)
  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return kindRank(a) - kindRank(b)
  })
}

/** Whether the events row should be shown at all this week. */
export function hasWeekEvents(courses: readonly Course[], now: Date, cfg: GridConfig): boolean {
  return collectWeekEvents(courses, now, cfg).length > 0
}
