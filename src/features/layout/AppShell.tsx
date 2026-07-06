import type { ReactNode } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Two-pane layout (replaces the legacy Split.js integration).
 *
 * - ≥ 1320px: both sections already fit comfortably — the right pane is wide
 *   enough for the full weekly calendar without horizontal scroll at the default
 *   split — so the split is a fixed 55/45 with NO drag handle; the middle line
 *   would only be clutter. The pair is capped (max-w) and centered so that on
 *   very wide screens the two sections stay a tight, symmetric unit instead of
 *   drifting apart around a large empty centre gutter (each pane otherwise
 *   centres its own capped content, and the two inner margins compound).
 * - 1024–1319px (or whenever browser zoom shrinks the CSS viewport into that
 *   band): the sections start to compete for width, so a draggable 55/45 split
 *   appears, persisted via autoSaveId ('tollab-split-v3').
 * - ≤ 1023px: the panes stack into one scrolling column.
 *
 * Both panes cap their content at max-w-4xl and scroll independently.
 */
export function AppShell({ left, right }: { left: ReactNode; right: ReactNode }) {
  const stacked = useMediaQuery('(max-width: 1023px)')
  const roomy = useMediaQuery('(min-width: 1320px)')

  if (stacked) {
    return (
      <div className="flex min-h-screen flex-col gap-8 px-4 pt-6 pb-16">
        <div className="mx-auto w-full max-w-3xl">{left}</div>
        <div className="mx-auto w-full max-w-3xl">{right}</div>
      </div>
    )
  }

  // p-8 (not pt-8) on the left keeps the inner course-list scroll field clear of
  // the window edge instead of running flush to it. Shared by both desktop
  // branches so the fixed and draggable splits are pixel-identical apart from the
  // handle.
  const leftInner = <div className="mx-auto h-full w-full max-w-4xl p-8">{left}</div>
  const rightInner = <div className="mx-auto w-full max-w-4xl px-6 pt-8 pb-16">{right}</div>

  if (roomy) {
    return (
      <div
        className="mx-auto grid h-screen w-full max-w-[1680px]"
        style={{ gridTemplateColumns: 'minmax(0, 55fr) minmax(0, 45fr)' }}
      >
        <div className="overflow-hidden">{leftInner}</div>
        <div className="overflow-y-auto [scrollbar-gutter:stable]">{rightInner}</div>
      </div>
    )
  }

  return (
    <PanelGroup direction="horizontal" autoSaveId="tollab-split-v3" className="!h-screen">
      <Panel defaultSize={55} minSize={30} className="!overflow-hidden">
        {leftInner}
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
        {rightInner}
      </Panel>
    </PanelGroup>
  )
}
