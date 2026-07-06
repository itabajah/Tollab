import type { ReactNode } from 'react'
import type { Course } from '@/domain/model'
import { courseMetaParts, courseProgress } from '@/domain/course'
import { IconButton } from '@/components/ui/IconButton'

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function ScreenIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="1" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ProgressStat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted" title={label}>
      {icon}
      {/* The icon is decorative (aria-hidden) and `title` is only a mouse tooltip,
          so an sr-only label carries the meaning to assistive tech. */}
      <span className="sr-only">{label}: </span>
      {value}
    </span>
  )
}

function ChevronIcon({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === 'up' ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  )
}

export function CourseCard({
  course,
  isFirst,
  isLast,
  onEdit,
  onMove,
}: {
  course: Course
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onMove: (delta: -1 | 1) => void
}) {
  const meta = courseMetaParts(course).join(' • ')
  const progress = courseProgress(course)
  const subtitle = [course.faculty, course.lecturer, course.location].filter(Boolean).join(' • ')

  return (
    // The whole card is the edit target via a stretched button (below), so the
    // content stays static, valid HTML (not block elements inside a <button>).
    <div
      data-course-card
      className="group relative flex items-stretch gap-3 rounded-card border border-line bg-panel p-4 shadow-sm transition-[box-shadow,border-color] duration-150 hover:border-line-strong hover:shadow-md"
    >
      <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: course.color }} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{course.name}</p>
        {subtitle ? <p className="truncate text-xs text-ink-faint">{subtitle}</p> : null}
        {meta ? <p className="mt-1 truncate text-xs text-ink-muted">{meta}</p> : null}
        {course.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-ink-faint">{course.notes}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3">
          {progress.lectures.total > 0 ? (
            <ProgressStat
              icon={<PlayIcon />}
              label="Lectures watched"
              value={`${progress.lectures.watched}/${progress.lectures.total}`}
            />
          ) : null}
          {progress.tutorials.total > 0 ? (
            <ProgressStat
              icon={<ScreenIcon />}
              label="Tutorials watched"
              value={`${progress.tutorials.watched}/${progress.tutorials.total}`}
            />
          ) : null}
          {progress.homework.total > 0 ? (
            <ProgressStat
              icon={<CheckIcon />}
              label="Homework completed"
              value={`${progress.homework.completed}/${progress.homework.total}`}
            />
          ) : null}
        </div>
      </div>

      {/* Stretched click target for editing — covers the card, sits beneath the
          reorder controls (which are z-10) so those stay independently clickable. */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${course.name}`}
        className="absolute inset-0 rounded-card focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none focus-visible:ring-inset"
      />

      <div className="relative z-10 flex flex-col justify-center gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton
          aria-label={`Move ${course.name} up`}
          disabled={isFirst}
          size="sm"
          className="!p-1"
          onClick={() => onMove(-1)}
        >
          <ChevronIcon dir="up" />
        </IconButton>
        <IconButton
          aria-label={`Move ${course.name} down`}
          disabled={isLast}
          size="sm"
          className="!p-1"
          onClick={() => onMove(1)}
        >
          <ChevronIcon dir="down" />
        </IconButton>
      </div>
    </div>
  )
}
