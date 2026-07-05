import { useState } from 'react'
import {
  collectWeekEvents,
  gridRowCount,
  hourLabels,
  layoutWeek,
  nowIndicator,
  ROWS_PER_HOUR,
  type GridConfig,
  type WeekEvent,
} from '@/domain/calendar'
import { weekRangeFor } from '@/lib/dates'
import { useAppState } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { IconButton } from '@/components/ui/IconButton'
import { useCourseDialog } from '@/features/courses/CourseDialogProvider'
import { cn } from '@/lib/cn'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_HEIGHT = 44 // px per hour

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function WeekCalendar({ now: nowProp }: { now?: Date }) {
  const now = useNow(nowProp)
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  )
  const { openCourse } = useCourseDialog()
  const [collapsed, setCollapsed] = useState(false)
  const [singleDay, setSingleDay] = useState(false)

  if (!semester) return null

  // Calendar all-day events deep-link into the course dialog: a homework chip
  // opens the Homework tab on that item, an exam chip opens Details on that moed.
  const openEvent = (event: WeekEvent) => {
    if (event.kind === 'homework' && event.homeworkId) {
      openCourse({
        courseId: event.courseId,
        tab: 'homework',
        highlight: { kind: 'homework', id: event.homeworkId },
      })
    } else if (event.kind === 'exam' && event.moed) {
      openCourse({
        courseId: event.courseId,
        tab: 'details',
        highlight: { kind: 'exam', moed: event.moed },
      })
    } else {
      openCourse({ courseId: event.courseId })
    }
  }

  const cfg: GridConfig = singleDay
    ? { ...semester.calendarSettings, visibleDays: [now.getDay()] }
    : semester.calendarSettings
  const visibleDays = cfg.visibleDays

  const slots = layoutWeek(semester.courses, cfg)
  const events = collectWeekEvents(semester.courses, now, cfg)
  const indicator = nowIndicator(now, cfg)
  const rowCount = gridRowCount(cfg)
  const labels = hourLabels(cfg)

  const todayDay = now.getDay()
  const weekStart = weekRangeFor(now).start
  const dateForDay = (day: number) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + day)
    return d.getDate()
  }

  const isEmpty = slots.length === 0 && events.length === 0

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium tracking-tight text-ink">Weekly Schedule</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSingleDay((v) => !v)}
            className="rounded-control border border-line px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-inset md:hidden"
            aria-label={singleDay ? 'Show all days' : 'Show today only'}
          >
            {singleDay ? 'All days' : 'Today only'}
          </button>
          <IconButton
            aria-label={collapsed ? 'Expand schedule' : 'Collapse schedule'}
            variant="ghost"
            onClick={() => setCollapsed((v) => !v)}
          >
            <ChevronIcon open={!collapsed} />
          </IconButton>
        </div>
      </div>

      {!collapsed ? (
        <div className="relative mt-4 overflow-hidden rounded-card border border-line bg-panel shadow-sm">
          <div className="overflow-x-auto">
            <div style={{ minWidth: visibleDays.length > 3 ? 520 : undefined }}>
              {/* Header row */}
              <div
                className="grid border-b border-line"
                style={{
                  gridTemplateColumns: `40px repeat(${visibleDays.length}, minmax(0, 1fr))`,
                }}
              >
                <div />
                {visibleDays.map((day) => (
                  <div key={day} className="px-1 py-1.5 text-center">
                    <div
                      className={cn(
                        'text-xs font-medium',
                        day === todayDay ? 'text-ink' : 'text-ink-muted',
                      )}
                    >
                      {DAY_NAMES[day]}
                    </div>
                    <div
                      className={cn(
                        'mx-auto mt-0.5 flex size-5 items-center justify-center rounded-full text-[11px]',
                        day === todayDay
                          ? 'bg-accent font-semibold text-on-accent'
                          : 'text-ink-faint',
                      )}
                    >
                      {dateForDay(day)}
                    </div>
                  </div>
                ))}
              </div>

              {events.length > 0 ? (
                <AllDayRow events={events} visibleDays={visibleDays} onOpenEvent={openEvent} />
              ) : null}

              {/* Time grid */}
              <div
                role="grid"
                aria-label="Weekly schedule"
                className="relative grid"
                style={{
                  gridTemplateColumns: `40px repeat(${visibleDays.length}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rowCount}, ${HOUR_HEIGHT / 12}px)`,
                }}
              >
                {/* Hour labels + gridlines */}
                {labels.map((label, i) => (
                  <div
                    key={label}
                    className="-mt-2 pr-1 text-right text-[10px] text-ink-faint"
                    style={{ gridColumn: 1, gridRow: `${i * 12 + 1} / span 12` }}
                  >
                    {label}
                  </div>
                ))}
                {labels.map((label, i) =>
                  visibleDays.map((day, colIdx) => (
                    <div
                      key={`${label}-${day}`}
                      className="border-t border-l border-t-line/60 border-l-line/20"
                      style={{ gridColumn: colIdx + 2, gridRow: `${i * 12 + 1} / span 12` }}
                    />
                  )),
                )}

                {/* Class blocks */}
                {slots.map((slot, i) => {
                  const widthPct = 100 / slot.laneCount
                  const showTime = slot.rowSpan >= ROWS_PER_HOUR / 2
                  return (
                    <button
                      key={`${slot.courseId}-${slot.day}-${i}`}
                      type="button"
                      onClick={() => openCourse({ courseId: slot.courseId })}
                      title={`${slot.courseName} ${slot.start}–${slot.end}${slot.location ? ` · ${slot.location}` : ''}`}
                      aria-label={`${slot.courseName} ${slot.start}–${slot.end}`}
                      className="z-10 overflow-hidden rounded-control px-1 py-0.5 text-left text-[10px] leading-tight text-white/95 shadow-xs transition-[filter,box-shadow] duration-150 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] hover:z-20 hover:shadow-md hover:brightness-110 focus-visible:z-20 focus-visible:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:brightness-95"
                      style={{
                        gridColumn: slot.column + 2,
                        gridRowStart: slot.rowStart,
                        gridRowEnd: `span ${slot.rowSpan}`,
                        backgroundColor: slot.color,
                        marginLeft: `${slot.lane * widthPct}%`,
                        width: `calc(${widthPct}% - 2px)`,
                        minHeight: 22,
                      }}
                    >
                      <span className="block truncate font-medium">{slot.courseName}</span>
                      {showTime ? (
                        <span className="block truncate opacity-90">{slot.start}</span>
                      ) : null}
                    </button>
                  )
                })}

                {/* Now line */}
                {indicator ? (
                  <div
                    data-testid="now-line"
                    className="pointer-events-none z-30 flex items-center"
                    style={{
                      gridColumn: indicator.column + 2,
                      gridRow: `1 / ${rowCount + 1}`,
                      alignSelf: 'start',
                      marginTop: `${indicator.rowFraction * rowCount * (HOUR_HEIGHT / 12)}px`,
                    }}
                  >
                    <span className="-ml-[3px] h-1.5 w-1.5 rounded-full bg-now-line" />
                    <span className="h-px flex-1 bg-now-line" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {isEmpty ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-16 flex items-center justify-center">
              <p className="text-xs text-ink-faint">
                No classes scheduled — add a course to build your week.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function AllDayRow({
  events,
  visibleDays,
  onOpenEvent,
}: {
  events: WeekEvent[]
  visibleDays: number[]
  onOpenEvent: (event: WeekEvent) => void
}) {
  return (
    <div
      data-testid="all-day-row"
      className="grid border-b border-line py-1"
      style={{ gridTemplateColumns: `40px repeat(${visibleDays.length}, minmax(0, 1fr))` }}
    >
      <div className="pr-1 text-right text-[9px] text-ink-faint">all-day</div>
      {visibleDays.map((day, colIdx) => (
        <div key={day} className="flex flex-col gap-0.5 px-0.5" style={{ gridColumn: colIdx + 2 }}>
          {events
            .filter((e) => e.day === day)
            .map((event) => (
              <button
                key={`${event.kind}-${event.courseId}-${event.moed ?? event.homeworkId}`}
                type="button"
                onClick={() => onOpenEvent(event)}
                className="flex items-center gap-1 truncate rounded-control border-l-2 px-1 py-0.5 text-left text-[9px] text-ink transition-[filter] duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                style={{
                  borderColor:
                    event.kind === 'exam' ? 'var(--error-border)' : 'var(--success-border)',
                  backgroundColor: event.kind === 'exam' ? 'var(--error-bg)' : 'var(--success-bg)',
                  textDecoration: event.completed ? 'line-through' : undefined,
                }}
                title={event.kind === 'exam' ? event.title : `${event.courseName}: ${event.title}`}
              >
                {event.kind === 'homework' ? (
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                ) : null}
                <span className="truncate">
                  {event.kind === 'exam' ? `! ${event.title}` : event.title}
                </span>
              </button>
            ))}
        </div>
      ))}
    </div>
  )
}
