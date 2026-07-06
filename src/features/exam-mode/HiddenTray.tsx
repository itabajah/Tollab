import type { ExamNode } from '@/domain/examMode'
import { Button } from '@/components/ui/Button'

/** A dashed tray of hidden exams with per-item and bulk restore. */
export function HiddenTray({
  hidden,
  onRestore,
  onRestoreAll,
}: {
  hidden: ExamNode[]
  onRestore: (nodeId: string) => void
  onRestoreAll: () => void
}) {
  if (hidden.length === 0) return null

  return (
    <div className="mt-4 rounded-xs border border-dashed border-line p-3" data-testid="hidden-tray">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] tracking-[0.5px] text-ink-muted uppercase">
          Hidden ({hidden.length})
        </span>
        <Button size="sm" variant="ghost" onClick={onRestoreAll}>
          Restore all
        </Button>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {hidden.map((node) => (
          <li key={node.id}>
            <button
              type="button"
              onClick={() => onRestore(node.id)}
              className="rounded-full border border-line bg-inset px-2.5 py-1 text-xs text-ink-muted hover:text-ink"
              aria-label={`Restore ${node.name}`}
            >
              {node.name}
              {node.label ? ` · ${node.label}` : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
