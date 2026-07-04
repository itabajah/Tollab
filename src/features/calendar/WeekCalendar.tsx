import { useState } from 'react'
import type { Course, Semester } from '@/domain/model'
import {
  collectWeekEvents,
  gridRowCount,
  hourLabels,
  layoutWeek,
  nowIndicator,
  type GridConfig,
  type WeekEvent,
} from '@/domain/calendar'
import { useAppState } from '@/hooks/session'
import { IconButton } from '@/components/ui/IconButton'
import { CourseFormDialog } from '@/features/courses/CourseFormDialog'

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

export function WeekCalendar({ now }: { now: Date }) {
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  ) as Semester | undefined
  const [collapsed, setCollapsed] = useState(false)
  const [singleDay, setSingleDay] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  if (!semester) return null

  const cfg: GridConfig = singleDay
    ? { ...semester.calendarSettings, visibleDays: [now.getDay()] }
    : semester.calendarSettings
  const visibleDays = cfg.visibleDays

  const slots = layoutWeek(semester.courses, cfg)
  const events = collectWeekEvents(semester.courses, now, cfg)
  const indicator = nowIndicator(now, cfg)
  const rowCount = gridRowCount(cfg)
  const labels = hourLabels(cfg)

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-ink">Weekly Schedule</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSingleDay((v) => !v)}
            className="rounded-xs border border-line px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-inset md:hidden"
            aria-label={singleDay ? 'Show all days' : 'Show today only'}
          >
            {singleDay ? 'All days' : 'Today only'}
          </button>
          <IconButton
            aria-label={collapsed ? 'Expand schedule' : 'Collapse schedule'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <ChevronIcon open={!collapsed} />
          </IconButton>
        </div>
      </div>

      {!collapsed ? (
        <div className="mt-4 overflow-x-auto">
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
                <div
                  key={day}
                  className="px-1 py-1.5 text-center text-xs font-medium text-ink-muted"
                >
                  {DAY_NAMES[day]}
                </div>
              ))}
            </div>

            {events.length > 0 ? (
              <AllDayRow
                events={events}
                visibleDays={visibleDays}
                onOpen={setEditingCourse}
                semester={semester}
              />
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
                    className="border-t border-l border-line/60"
                    style={{ gridColumn: colIdx + 2, gridRow: `${i * 12 + 1} / span 12` }}
                  />
                )),
              )}

              {/* Class blocks */}
              {slots.map((slot, i) => {
                const widthPct = 100 / slot.laneCount
                return (
                  <button
                    key={`${slot.courseId}-${slot.day}-${i}`}
                    type="button"
                    onClick={() =>
                      setEditingCourse(semester.courses.find((c) => c.id === slot.courseId) ?? null)
                    }
                    title={`${slot.courseName} ${slot.start}–${slot.end}${slot.location ? ` · ${slot.location}` : ''}`}
                    aria-label={`${slot.courseName} ${slot.start}–${slot.end}`}
                    className="z-10 overflow-hidden rounded-xs px-1 py-0.5 text-left text-[10px] leading-tight text-white/95"
                    style={{
                      gridColumn: slot.column + 2,
                      gridRowStart: slot.rowStart,
                      gridRowEnd: `span ${slot.rowSpan}`,
                      backgroundColor: slot.color,
                      marginLeft: `${slot.lane * widthPct}%`,
                      width: `calc(${widthPct}% - 2px)`,
                    }}
                  >
                    <span className="block truncate font-medium">{slot.courseName}</span>
                    <span className="block truncate opacity-90">{slot.start}</span>
                  </button>
                )
              })}

              {/* Now line */}
              {indicator ? (
                <div
                  data-testid="now-line"
                  className="pointer-events-none z-20 flex items-center"
                  style={{
                    gridColumn: indicator.column + 2,
                    gridRow: `1 / ${rowCount + 1}`,
                    alignSelf: 'start',
                    marginTop: `${indicator.rowFraction * rowCount * (HOUR_HEIGHT / 12)}px`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-now-line" />
                  <span className="h-px flex-1 bg-now-line" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <CourseFormDialog
        open={editingCourse !== null}
        course={editingCourse}
        onOpenChange={(open) => {
          if (!open) setEditingCourse(null)
        }}
      />
    </section>
  )
}

function AllDayRow({
  events,
  visibleDays,
  semester,
  onOpen,
}: {
  events: WeekEvent[]
  visibleDays: number[]
  semester: Semester
  onOpen: (course: Course) => void
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
                onClick={() => onOpen(semester.courses.find((c) => c.id === event.courseId)!)}
                className="truncate rounded-xs border-l-2 px-1 py-0.5 text-left text-[9px] text-ink"
                style={{
                  borderColor:
                    event.kind === 'exam' ? 'var(--error-border)' : 'var(--success-border)',
                  backgroundColor: event.kind === 'exam' ? 'var(--error-bg)' : 'var(--success-bg)',
                  textDecoration: event.completed ? 'line-through' : undefined,
                }}
                title={event.kind === 'exam' ? event.title : `${event.courseName}: ${event.title}`}
              >
                {event.kind === 'exam' ? `! ${event.title}` : event.title}
              </button>
            ))}
        </div>
      ))}
    </div>
  )
}
