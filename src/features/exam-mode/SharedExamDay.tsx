import type { AnnotatedExamNode } from '@/domain/examMode'
import { ExamNode } from './ExamNode'

/**
 * Two or more exams that fall on the SAME day. Each keeps its own full roadmap
 * box (a normal ExamNode, with every state/badge/action); a labelled outer
 * frame groups them so the day reads as a single step in the snake — with no
 * connector arrow between siblings. Works for any count and any mix of
 * course/custom exams: the domain collapses same-day nodes into one cell, so
 * they are always contiguous here regardless of where the cell falls.
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
  return (
    <div className="rounded-card border border-line-strong bg-inset p-1.5">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="text-[9px] font-bold tracking-[0.6px] text-ink-faint uppercase">
          Same day
        </span>
        <span className="text-[10px] font-medium text-ink-faint">{group.length} exams</span>
      </div>
      <div className="flex flex-col gap-2">
        {group.map((node) => (
          <ExamNode
            key={node.id}
            node={node}
            onOpen={() => onOpen(node)}
            onRemove={() => onRemove(node)}
            onEdit={node.kind === 'custom' ? () => onEdit(node) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
