import type { ReactNode } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Two-pane resizable layout (replaces the legacy Split.js integration).
 * Desktop: draggable 65/35 split persisted via autoSaveId. Below 1024px the
 * panes stack into one scrolling column, matching the legacy breakpoints.
 */
export function AppShell({ left, right }: { left: ReactNode; right: ReactNode }) {
  const stacked = useMediaQuery('(max-width: 1023px)')

  if (stacked) {
    return (
      <div className="flex min-h-screen flex-col gap-8 px-4 pt-6 pb-16">
        <div>{left}</div>
        <div>{right}</div>
      </div>
    )
  }

  return (
    <PanelGroup direction="horizontal" autoSaveId="tollab-split" className="!h-screen">
      <Panel defaultSize={65} minSize={40} className="!overflow-y-auto">
        <div className="px-10 pt-8 pb-14">{left}</div>
      </Panel>
      <PanelResizeHandle className="w-1 bg-line transition-colors hover:bg-line-strong data-[resize-handle-state=drag]:bg-accent" />
      <Panel defaultSize={35} minSize={25} className="!overflow-y-auto">
        <div className="px-6 pt-8 pb-14">{right}</div>
      </Panel>
    </PanelGroup>
  )
}
