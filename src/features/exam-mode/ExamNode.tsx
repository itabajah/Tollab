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
 * A single roadmap exam node. Course exams open the course; custom exams get
 * an inline Edit affordance. Every node can be hidden (non-destructively).
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

  return (
    <div
      data-exam-id={node.id}
      data-state={node.state}
      data-next={node.isNext}
      className={cn(
        'relative flex flex-col gap-0.5 rounded-xs border bg-panel p-2 text-xs',
        node.kind === 'custom' && 'border-dashed',
        stateClasses[node.state],
        node.isNext && 'ring-2 ring-accent',
      )}
      style={{ borderColor: color === 'var(--accent)' ? undefined : color }}
    >
      {node.isNext ? (
        <span className="absolute -top-2 left-2 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-on-accent">
          NEXT
        </span>
      ) : null}

      <button type="button" onClick={onOpen} className="flex flex-col gap-0.5 text-left">
        <span className="truncate font-medium text-ink">{node.name}</span>
        {node.label ? <span className="text-[10px] text-ink-muted">{node.label}</span> : null}
        <span className="text-[10px] text-ink-faint">{formatShortDate(node.date)}</span>
        <span className="text-[10px] font-medium text-ink-muted">
          {formatCountdown(node.daysUntil)}
        </span>
      </button>

      <div className="mt-1 flex items-center gap-1">
        {node.kind === 'custom' && onEdit ? (
          <button
            type="button"
            aria-label={`Edit ${node.name}`}
            onClick={onEdit}
            className="rounded-xs border border-line px-1.5 py-0.5 text-[10px] text-ink-muted hover:bg-inset"
          >
            Edit
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Hide ${node.name}`}
          onClick={onRemove}
          className="ml-auto text-sm leading-none text-ink-faint hover:text-error-border"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
