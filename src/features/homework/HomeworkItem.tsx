import { useEffect, useRef, useState } from 'react'
import type { Homework } from '@/domain/model'
import { isOverdue } from '@/domain/homework'
import { daysUntil, formatShortDate } from '@/lib/dates'
import { useAppActions } from '@/hooks/session'
import { useHighlight } from '@/hooks/useHighlight'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field, Input, TextArea } from '@/components/ui/Field'
import { useCourseDialog } from '@/features/courses/CourseDialogProvider'
import { cn } from '@/lib/cn'

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
 * A homework row shared by the course editor (full editing surface) and the
 * right-pane sidebar (compact, cross-course). The variant selects which
 * sub-row renders so each keeps its own, unconditional set of hooks.
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

/** Relative urgency badge (overdue / today / tomorrow / N days), token-colored. */
function dueBadge(homework: Homework, today: Date): { text: string; tone: string } | null {
  if (homework.completed) return null
  const diff = daysUntil(homework.dueDate, today)
  if (diff === null) return null
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, tone: 'text-error-text font-medium' }
  if (diff === 0) return { text: 'Today', tone: 'text-warning-text font-medium' }
  if (diff === 1) return { text: 'Tomorrow', tone: 'text-warning-text' }
  return { text: `${diff}d left`, tone: 'text-ink-faint' }
}

/** Short date plus a relative urgency badge. */
function DueLabel({ homework, today }: { homework: Homework; today: Date }) {
  const diff = daysUntil(homework.dueDate, today)
  if (diff === null) {
    return <span className="text-xs text-ink-faint italic">No date</span>
  }
  const badge = dueBadge(homework, today)
  return (
    <span className="text-xs text-ink-faint">
      Due {formatShortDate(homework.dueDate)}
      {badge ? <span className={cn('ml-1.5', badge.tone)}>[{badge.text}]</span> : null}
    </span>
  )
}

function ReorderControls({
  title,
  isFirst,
  isLast,
  onMove,
}: {
  title: string
  isFirst: boolean
  isLast: boolean
  onMove: (delta: -1 | 1) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <IconButton
        aria-label={`Move ${title} up`}
        disabled={isFirst}
        size="sm"
        variant="ghost"
        className="!p-0.5"
        onClick={() => onMove(-1)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </IconButton>
      <IconButton
        aria-label={`Move ${title} down`}
        disabled={isLast}
        size="sm"
        variant="ghost"
        className="!p-0.5"
        onClick={() => onMove(1)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </IconButton>
    </div>
  )
}

function EditorRow({
  courseId,
  homework,
  today,
  showReorder,
  isFirst,
  isLast,
  highlight,
}: {
  courseId: string
  homework: Homework
  today: Date
  showReorder: boolean
  isFirst: boolean
  isLast: boolean
  highlight: boolean
}) {
  const {
    updateHomework,
    removeHomework,
    toggleHomework,
    moveHomework,
    addHomeworkLink,
    removeHomeworkLink,
  } = useAppActions()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const overdue = isOverdue(homework, today)

  // Deep-link: expand and pulse this row when it becomes the highlight target.
  const rootRef = useRef<HTMLDivElement>(null)
  useHighlight(rootRef, highlight)
  useEffect(() => {
    if (highlight) setEditing(true)
  }, [highlight])

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete Assignment',
      message: `Delete "${homework.title}"?`,
      confirmLabel: 'Delete',
      dangerous: true,
    })
    if (!ok) return
    removeHomework(courseId, homework.id)
    toast.success('Assignment deleted')
  }

  const addLink = () => {
    const url = linkUrl.trim()
    if (!url) return
    addHomeworkLink(courseId, homework.id, url)
    setLinkUrl('')
  }

  return (
    <div
      ref={rootRef}
      data-homework-id={homework.id}
      data-overdue={overdue}
      className={cn(
        'rounded-control border border-line bg-inset p-2.5',
        overdue && 'border-l-2 border-l-error-border',
        homework.completed && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2">
        {showReorder ? (
          <ReorderControls
            title={homework.title}
            isFirst={isFirst}
            isLast={isLast}
            onMove={(delta) => moveHomework(courseId, homework.id, delta)}
          />
        ) : null}

        <Checkbox
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
          <DueLabel homework={homework} today={today} />
        </div>

        <Button
          variant="ghost"
          size="sm"
          aria-label={`Edit ${homework.title}`}
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
        >
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          aria-label={`Delete ${homework.title}`}
          onClick={() => void onDelete()}
        >
          Delete
        </Button>
      </div>

      {editing ? (
        <div className="mt-2.5 flex flex-col gap-3 rounded-control border border-line bg-panel p-3">
          <Field label="Title">
            {(id) => (
              <Input
                id={id}
                value={homework.title}
                onChange={(e) => updateHomework(courseId, homework.id, { title: e.target.value })}
              />
            )}
          </Field>
          <Field label="Due date">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={homework.dueDate}
                onChange={(e) => updateHomework(courseId, homework.id, { dueDate: e.target.value })}
              />
            )}
          </Field>
          <Field label="Notes">
            {(id) => (
              <TextArea
                id={id}
                value={homework.notes}
                placeholder="Add notes…"
                onChange={(e) => updateHomework(courseId, homework.id, { notes: e.target.value })}
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <span className="label-caps text-ink-muted">Links</span>
            {homework.links.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {homework.links.map((link, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-control border border-line bg-inset px-2 py-0.5 text-xs text-ink hover:bg-surface"
                    >
                      {link.label || link.url}
                    </a>
                    <span
                      className="min-w-0 flex-1 truncate text-xs text-ink-faint"
                      title={link.url}
                    >
                      {link.url}
                    </span>
                    <IconButton
                      aria-label={`Remove ${link.label || 'link'}`}
                      danger
                      size="sm"
                      variant="ghost"
                      className="!p-1 text-sm leading-none"
                      onClick={() => removeHomeworkLink(courseId, homework.id, index)}
                    >
                      ×
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center gap-2">
              <Input
                aria-label="Link URL"
                placeholder="Paste a URL…"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLink()
                  }
                }}
              />
              <Button size="sm" aria-label="Add link" onClick={addLink}>
                Add
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
        <p className="truncate text-xs text-ink-muted">
          {courseName}
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
