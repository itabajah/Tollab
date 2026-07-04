import type { Course } from '@/domain/model'
import { courseMetaParts, courseProgress } from '@/domain/course'
import { IconButton } from '@/components/ui/IconButton'

function ProgressRow({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted" title={label}>
      {value}
    </span>
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
    <div
      data-course-card
      className="group flex items-stretch gap-3 rounded-xs border border-line bg-panel p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
    >
      <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: course.color }} />

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${course.name}`}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate font-medium text-ink">{course.name}</p>
        {subtitle ? <p className="truncate text-xs text-ink-faint">{subtitle}</p> : null}
        {meta ? <p className="mt-1 truncate text-xs text-ink-muted">{meta}</p> : null}
        {course.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-ink-faint">{course.notes}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3">
          {progress.lectures.total > 0 ? (
            <ProgressRow
              label="Lectures watched"
              value={`▶ ${progress.lectures.watched}/${progress.lectures.total}`}
            />
          ) : null}
          {progress.tutorials.total > 0 ? (
            <ProgressRow
              label="Tutorials watched"
              value={`◧ ${progress.tutorials.watched}/${progress.tutorials.total}`}
            />
          ) : null}
          {progress.homework.total > 0 ? (
            <ProgressRow
              label="Homework completed"
              value={`✓ ${progress.homework.completed}/${progress.homework.total}`}
            />
          ) : null}
        </div>
      </button>

      <div className="flex flex-col justify-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
        <IconButton
          aria-label={`Move ${course.name} up`}
          disabled={isFirst}
          className="!p-1"
          onClick={() => onMove(-1)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </IconButton>
        <IconButton
          aria-label={`Move ${course.name} down`}
          disabled={isLast}
          className="!p-1"
          onClick={() => onMove(1)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </IconButton>
      </div>
    </div>
  )
}
