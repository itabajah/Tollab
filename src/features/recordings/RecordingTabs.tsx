import type { RecordingTab } from '@/domain/model'
import { cn } from '@/lib/cn'

/**
 * The sub-tab bar over a course's recording tabs. Each tab shows its item
 * count; the trailing button opens the add-tab prompt. Selection is owned by
 * the parent (RecordingsTab).
 */
export function RecordingTabs({
  tabs,
  selectedTabId,
  onSelect,
  onAddTab,
}: {
  tabs: readonly RecordingTab[]
  selectedTabId: string
  onSelect: (tabId: string) => void
  onAddTab: () => void
}) {
  return (
    <div
      role="group"
      aria-label="Recording tabs"
      className="flex flex-wrap items-center gap-1 border-b border-line pb-2"
    >
      {tabs.map((tab) => {
        const active = tab.id === selectedTabId
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-sm transition-colors',
              active
                ? 'border-line bg-inset text-ink'
                : 'border-transparent text-ink-muted hover:bg-inset hover:text-ink',
            )}
          >
            <span>{tab.name}</span>
            <span
              className={cn(
                'rounded-xs px-1 text-xs tabular-nums',
                active ? 'bg-accent text-on-accent' : 'bg-inset text-ink-faint',
              )}
            >
              {tab.items.length}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        aria-label="Add tab"
        onClick={onAddTab}
        className="ml-1 inline-flex items-center rounded-xs border border-dashed border-line-strong px-2.5 py-1 text-sm text-ink-muted transition-colors hover:bg-inset hover:text-ink"
      >
        +
      </button>
    </div>
  )
}
