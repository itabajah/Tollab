import type { ReactNode } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Two-pane resizable layout (replaces the legacy Split.js integration).
 * Desktop: draggable 55/45 split persisted via autoSaveId ('tollab-split-v3');
 * each pane scrolls independently and caps its content at max-w-4xl. Below
 * 1024px the panes stack into one scrolling column.
 */
export function AppShell({ left, right }: { left: ReactNode; right: ReactNode }) {
  const stacked = useMediaQuery('(max-width: 1023px)')

  if (stacked) {
    return (
      <div className="flex min-h-screen flex-col gap-8 px-4 pt-6 pb-16">
        <div className="mx-auto w-full max-w-3xl">{left}</div>
        <div className="mx-auto w-full max-w-3xl">{right}</div>
      </div>
    )
  }

  return (
    <PanelGroup direction="horizontal" autoSaveId="tollab-split-v3" className="!h-screen">
      <Panel defaultSize={55} minSize={30} className="!overflow-hidden">
        {/* p-8 (not pt-8): the bottom padding keeps the inner course-list scroll
            field clear of the window edge instead of running flush to it. */}
        <div className="mx-auto h-full w-full max-w-4xl p-8">{left}</div>
      </Panel>
      <PanelResizeHandle className="group relative w-2 cursor-col-resize outline-none">
        {/* The visible hairline sits centered in a wider transparent hit area. */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line transition-colors group-hover:bg-line-strong group-focus-visible:bg-accent group-data-[resize-handle-state=drag]:bg-accent" />
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[3px] opacity-0 transition-opacity group-hover:opacity-100 group-data-[resize-handle-state=drag]:opacity-100">
          <span className="size-[3px] rounded-full bg-ink-faint" />
          <span className="size-[3px] rounded-full bg-ink-faint" />
          <span className="size-[3px] rounded-full bg-ink-faint" />
        </div>
      </PanelResizeHandle>
      <Panel defaultSize={45} minSize={25} className="!overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto w-full max-w-4xl px-6 pt-8 pb-16">{right}</div>
      </Panel>
    </PanelGroup>
  )
}
