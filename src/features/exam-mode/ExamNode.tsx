import type { AnnotatedExamNode } from '@/domain/examMode'
import { cssColor, formatCountdown } from '@/domain/examMode'
import { formatShortDate } from '@/lib/dates'
import { cn } from '@/lib/cn'

const stateClasses: Record<AnnotatedExamNode['state'], string> = {
  passed: 'opacity-50',
  today: 'border-success-border',
  upcoming: '',
}

/**
 * A compact mark distinguishing Moed A from Moed B at a glance: A is filled,
 * B is outlined (monochrome, so it reads in both themes). Null for custom exams.
 */
export function MoedBadge({ moed }: { moed: 'A' | 'B' | null }) {
  if (!moed) return null
  return (
    <span
      title={`Moed ${moed}`}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold',
        moed === 'A' ? 'bg-ink text-panel' : 'border border-line-strong text-ink-muted',
      )}
    >
      {moed}
    </span>
  )
}

/**
 * A single roadmap exam node. The per-course color lives on a leading dot so the
 * element border is free to express lifecycle state (today / passed) and the
 * NEXT ring can escalate as the exam nears. Course exams open the course; custom
 * exams get an inline Edit affordance; every node can be hidden non-destructively.
 */
export function ExamNode({
  node,
  onOpen,
  onRemove,
  onEdit,
}: {
  node: AnnotatedExamNode
  onOpen: () => void
  onRemove: () => void
  onEdit?: (() => void) | undefined
}) {
  const color = cssColor(node.color)
  const urgent = node.isNext && node.daysUntil !== null && node.daysUntil <= 3
  const veryUrgent = node.isNext && node.daysUntil !== null && node.daysUntil <= 1

  return (
    <div
      data-exam-id={node.id}
      data-state={node.state}
      data-next={node.isNext}
      className={cn(
        'relative flex flex-col gap-0.5 rounded-card border border-line bg-panel p-2 text-xs shadow-xs transition-[box-shadow,border-color] duration-150 hover:shadow-sm',
        node.kind === 'custom' && 'border-dashed',
        stateClasses[node.state],
        veryUrgent && 'bg-warning-bg',
        node.isNext && (urgent ? 'ring-2 ring-warning-border' : 'ring-2 ring-accent'),
      )}
    >
      {node.isNext ? (
        <span
          className={cn(
            'absolute -top-2 left-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide',
            urgent ? 'bg-warning-border text-white' : 'bg-accent text-on-accent',
          )}
        >
          NEXT
        </span>
      ) : null}

      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col gap-0.5 rounded-control text-left focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{node.name}</span>
          <MoedBadge moed={node.moed} />
        </span>
        {!node.moed && node.label ? (
          <span className="text-[10px] text-ink-muted">{node.label}</span>
        ) : null}
        <span className="text-[10px] text-ink-faint">{formatShortDate(node.date)}</span>
        <span
          className={cn(
            'text-[10px] font-medium',
            veryUrgent ? 'text-warning-text' : node.isNext ? 'text-ink' : 'text-ink-muted',
          )}
        >
          {formatCountdown(node.daysUntil)}
        </span>
      </button>

      <div className="mt-1 flex items-center gap-1">
        {node.kind === 'custom' && onEdit ? (
          <button
            type="button"
            aria-label={`Edit ${node.name}`}
            onClick={onEdit}
            className="rounded-control border border-line px-1.5 py-0.5 text-[10px] text-ink-muted transition-colors hover:bg-inset focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
          >
            Edit
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Hide ${node.name}`}
          onClick={onRemove}
          className="ml-auto rounded-control px-1 text-sm leading-none text-ink-faint transition-colors hover:text-error-border focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
