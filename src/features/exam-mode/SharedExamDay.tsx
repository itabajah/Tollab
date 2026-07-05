import type { AnnotatedExamNode } from '@/domain/examMode'
import { cssColor, formatCountdown } from '@/domain/examMode'
import { formatShortDate } from '@/lib/dates'
import { CloseIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { MoedBadge } from './ExamNode'

/**
 * A single box for two or more exams that fall on the SAME day — grouped so the
 * roadmap doesn't show a misleading 0-day step between them. The day and its
 * countdown are shared (identical for every exam in the box); each exam keeps
 * its own Moed mark, open/hide affordance, and (for custom exams) edit button.
 */
export function SharedExamDay({
  group,
  onOpen,
  onRemove,
  onEdit,
}: {
  group: AnnotatedExamNode[]
  onOpen: (node: AnnotatedExamNode) => void
  onRemove: (node: AnnotatedExamNode) => void
  onEdit: (node: AnnotatedExamNode) => void
}) {
  // Every exam in a same-day group shares date/countdown/state, so read them
  // off the first (guaranteed present — the parent only builds non-empty groups).
  const head = group[0]!
  const nextNode = group.find((n) => n.isNext)
  const urgent = nextNode !== undefined && nextNode.daysUntil <= 3
  const veryUrgent = nextNode !== undefined && nextNode.daysUntil <= 1
  const allPassed = group.every((n) => n.state === 'passed')

  return (
    <div
      className={cn(
        'relative flex flex-col gap-1.5 rounded-card border border-line bg-panel p-2 text-xs shadow-xs',
        allPassed && 'opacity-50',
        head.state === 'today' && 'border-success-border',
        // Match ExamNode's escalation: an imminent (<=1 day) next exam tints the
        // whole box, not just the ring.
        veryUrgent && 'bg-warning-bg',
        nextNode !== undefined && (urgent ? 'ring-2 ring-warning-border' : 'ring-2 ring-accent'),
      )}
    >
      {nextNode !== undefined ? (
        <span
          className={cn(
            'absolute -top-2 left-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide',
            urgent ? 'bg-warning-border text-white' : 'bg-accent text-on-accent',
          )}
        >
          NEXT
        </span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] text-ink-faint">
          {formatShortDate(head.date)} ·{' '}
          <span className={cn(urgent ? 'font-medium text-warning-text' : 'text-ink-muted')}>
            {formatCountdown(head.daysUntil)}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-inset px-1.5 py-0.5 text-[9px] font-medium text-ink-faint">
          {group.length} exams
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {group.map((node) => (
          <li
            key={node.id}
            data-exam-id={node.id}
            data-state={node.state}
            data-next={node.isNext}
            className="flex items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: cssColor(node.color) }}
            />
            <button
              type="button"
              onClick={() => onOpen(node)}
              className="min-w-0 flex-1 truncate rounded-control text-left font-medium text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
            >
              {node.name}
            </button>
            <MoedBadge moed={node.moed} />
            {node.kind === 'custom' ? (
              <button
                type="button"
                aria-label={`Edit ${node.name}`}
                onClick={() => onEdit(node)}
                className="rounded-control px-1 text-[10px] text-ink-muted transition-colors hover:bg-inset focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              aria-label={`Hide ${node.name}`}
              onClick={() => onRemove(node)}
              className="shrink-0 rounded-control p-0.5 text-ink-faint transition-colors hover:text-error-border focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
            >
              <CloseIcon width={11} height={11} strokeWidth={2.5} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
