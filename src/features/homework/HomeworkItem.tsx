import { useState } from 'react'
import type { Homework } from '@/domain/model'
import { isOverdue } from '@/domain/homework'
import { daysUntil, formatShortDate } from '@/lib/dates'
import { useAppActions } from '@/hooks/session'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Field, Input, TextArea } from '@/components/ui/Field'
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
    />
  )
}

/** Short date plus a relative urgency badge (overdue / today / N days). */
function DueLabel({ homework, today }: { homework: Homework; today: Date }) {
  const diff = daysUntil(homework.dueDate, today)
  if (diff === null) {
    return <span className="text-xs text-ink-faint italic">No date</span>
  }

  let badge: string | null = null
  let tone = 'text-ink-faint'
  if (!homework.completed) {
    if (diff < 0) {
      badge = `${Math.abs(diff)}d overdue`
      tone = 'text-error-border font-medium'
    } else if (diff === 0) {
      badge = 'Today'
      tone = 'text-warning-border font-medium'
    } else if (diff === 1) {
      badge = 'Tomorrow'
      tone = 'text-warning-border'
    } else {
      badge = `${diff}d left`
    }
  }

  return (
    <span className="text-xs text-ink-faint">
      Due {formatShortDate(homework.dueDate)}
      {badge ? <span className={cn('ml-1.5', tone)}>[{badge}]</span> : null}
    </span>
  )
}

function EditorRow({
  courseId,
  homework,
  today,
  showReorder,
  isFirst,
  isLast,
}: {
  courseId: string
  homework: Homework
  today: Date
  showReorder: boolean
  isFirst: boolean
  isLast: boolean
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
      data-homework-id={homework.id}
      data-overdue={isOverdue(homework, today)}
      className={cn(
        'rounded-xs border border-line bg-inset p-2.5',
        homework.completed && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2">
        {showReorder ? (
          <div className="flex flex-col gap-0.5">
            <IconButton
              aria-label={`Move ${homework.title} up`}
              disabled={isFirst}
              className="!p-0.5 text-[10px] leading-none"
              onClick={() => moveHomework(courseId, homework.id, -1)}
            >
              ▲
            </IconButton>
            <IconButton
              aria-label={`Move ${homework.title} down`}
              disabled={isLast}
              className="!p-0.5 text-[10px] leading-none"
              onClick={() => moveHomework(courseId, homework.id, 1)}
            >
              ▼
            </IconButton>
          </div>
        ) : null}

        <input
          type="checkbox"
          aria-label={homework.title}
          checked={homework.completed}
          onChange={() => toggleHomework(courseId, homework.id)}
          className="size-4 shrink-0 accent-accent"
        />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm font-medium text-ink',
              homework.completed && 'line-through',
            )}
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
        <div className="mt-2.5 flex flex-col gap-3 rounded-xs border border-line bg-panel p-3">
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
            <span className="text-[13px] tracking-[0.5px] text-ink-muted uppercase">Links</span>
            {homework.links.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {homework.links.map((link, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-xs border border-line bg-inset px-2 py-0.5 text-xs text-ink hover:bg-surface"
                    >
                      {link.label || link.url}
                    </a>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-faint">
                      {link.url}
                    </span>
                    <IconButton
                      aria-label={`Remove ${link.label || 'link'}`}
                      danger
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

  return (
    <div
      data-homework-id={homework.id}
      data-overdue={isOverdue(homework, today)}
      className={cn(
        'flex items-start gap-2.5 rounded-xs border border-line border-l-2 bg-panel p-2.5',
        homework.completed && 'opacity-60',
      )}
      style={courseColor ? { borderLeftColor: courseColor } : undefined}
    >
      <input
        type="checkbox"
        aria-label={homework.title}
        checked={homework.completed}
        onChange={() => toggleHomework(courseId, homework.id)}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />
      <div className="min-w-0 flex-1">
        <DueLabel homework={homework} today={today} />
        <p
          className={cn(
            'truncate text-sm font-medium text-ink',
            homework.completed && 'line-through',
          )}
        >
          {homework.title}
        </p>
        <p className="truncate text-xs text-ink-muted">{courseName}</p>
      </div>
    </div>
  )
}
