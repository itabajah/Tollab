import type { Homework } from '@/domain/model'
import { isOverdue } from '@/domain/homework'
import { useAppActions } from '@/hooks/session'
import { Checkbox } from '@/components/ui/Checkbox'
import { useCourseDialog } from '@/features/courses/CourseDialogProvider'
import { cn } from '@/lib/cn'
import { dueBadge } from './dueBadge'
import { EditorRow } from './HomeworkEditorRow'

export type HomeworkItemProps =
  | {
      variant?: 'editor'
      courseId: string
      homework: Homework
      today: Date
      /** Show up/down reorder buttons (only meaningful under manual sort). */
      showReorder?: boolean
      isFirst?: boolean
      isLast?: boolean
      /** Deep-link target: scroll to, expand, and briefly highlight this row. */
      highlight?: boolean
    }
  | {
      variant: 'sidebar'
      courseId: string
      homework: Homework
      today: Date
      courseName: string
      courseColor?: string
    }

/**
 * A homework row shared by the course editor (full editing surface, see
 * {@link EditorRow}) and the right-pane sidebar (compact, cross-course). The
 * variant selects which sub-row renders so each keeps its own, unconditional
 * set of hooks.
 */
export function HomeworkItem(props: HomeworkItemProps) {
  if (props.variant === 'sidebar') {
    return (
      <SidebarRow
        courseId={props.courseId}
        homework={props.homework}
        today={props.today}
        courseName={props.courseName}
        courseColor={props.courseColor}
      />
    )
  }
  return (
    <EditorRow
      courseId={props.courseId}
      homework={props.homework}
      today={props.today}
      showReorder={props.showReorder ?? false}
      isFirst={props.isFirst ?? false}
      isLast={props.isLast ?? false}
      highlight={props.highlight ?? false}
    />
  )
}

function SidebarRow({
  courseId,
  homework,
  today,
  courseName,
  courseColor,
}: {
  courseId: string
  homework: Homework
  today: Date
  courseName: string
  courseColor?: string | undefined
}) {
  const { toggleHomework } = useAppActions()
  const { openCourse } = useCourseDialog()
  const overdue = isOverdue(homework, today)
  const badge = dueBadge(homework, today)

  return (
    <div
      data-homework-id={homework.id}
      data-overdue={overdue}
      className={cn(
        'group relative flex items-start gap-2.5 rounded-card border border-line border-l-2 bg-panel p-2.5 shadow-sm transition-shadow duration-150 hover:shadow-md',
        homework.completed && 'opacity-60',
      )}
      style={{
        borderLeftColor: overdue ? 'var(--error-border)' : (courseColor ?? undefined),
      }}
    >
      <Checkbox
        className="relative z-10 mt-0.5"
        aria-label={homework.title}
        checked={homework.completed}
        onCheckedChange={() => toggleHomework(courseId, homework.id)}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium text-ink',
            homework.completed && 'line-through',
          )}
          title={homework.title}
        >
          {homework.title}
        </p>
        {/* Course names are Technion data and usually Hebrew. <bdi> resolves the
            name as its own directional run so the bidi algorithm can't drag the
            badge's leading digit across it ("8 · <hebrew> d left"). See lib/bidi. */}
        <p className="truncate text-xs text-ink-muted">
          <bdi>{courseName}</bdi>
          {badge ? <span className={cn('ml-1.5', badge.tone)}>· {badge.text}</span> : null}
        </p>
      </div>
      {/* Stretched deep-link into the course's Homework tab, on this assignment. */}
      <button
        type="button"
        aria-label={`Open ${homework.title}`}
        onClick={() =>
          openCourse({
            courseId,
            tab: 'homework',
            highlight: { kind: 'homework', id: homework.id },
          })
        }
        className="absolute inset-0 rounded-card focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none focus-visible:ring-inset"
      />
    </div>
  )
}
