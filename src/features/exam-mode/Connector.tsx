import { cn } from '@/lib/cn'

/**
 * The day-gap between two consecutive exams — the roadmap's most important
 * number, so it's the visual hero of every connector. Tight gaps (<= 2 days)
 * pick up a warning tint to flag cram risk. Returns null for zero/undefined.
 */
function GapLabel({ days }: { days: number | null }) {
  if (days === null || days <= 0) return null
  const tight = days <= 2
  return (
    <span
      className={cn(
        'z-10 inline-flex shrink-0 items-baseline gap-px rounded-full border bg-panel px-2 py-0.5 leading-none shadow-xs',
        tight ? 'border-warning-border text-warning-text' : 'border-line-strong text-ink',
      )}
    >
      <span className="text-xs font-bold tabular-nums">{days}</span>
      <span className="text-[9px] font-medium opacity-70">d</span>
    </span>
  )
}

/** A chevron arrowhead pointing in the flow direction. */
function Arrowhead({ dir }: { dir: 'left' | 'right' | 'down' }) {
  const d = dir === 'right' ? 'M9 6l6 6-6 6' : dir === 'left' ? 'M15 6l-6 6 6 6' : 'M6 9l6 6 6-6'
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink-muted"
    >
      <path d={d} />
    </svg>
  )
}

/**
 * Horizontal connector bridging two side-by-side nodes. Absolutely positioned
 * so it straddles the grid gap without affecting column widths; anchored to a
 * fixed height so a whole row's connectors form one clean band. `dir` is the
 * flow direction (right on L→R rows, left on the reversed R→L rows).
 */
export function HorizontalConnector({ days, dir }: { days: number | null; dir: 'left' | 'right' }) {
  return (
    <div
      className="pointer-events-none absolute top-7 left-full z-10 flex h-5 w-24 -translate-y-1/2 items-center gap-1"
      aria-hidden="true"
    >
      {dir === 'left' ? <Arrowhead dir="left" /> : null}
      <div className="h-0.5 flex-1 rounded-full bg-line-strong" />
      <GapLabel days={days} />
      <div className="h-0.5 flex-1 rounded-full bg-line-strong" />
      {dir === 'right' ? <Arrowhead dir="right" /> : null}
    </div>
  )
}

/**
 * The row-drop turn connector between two serpentine rows: a vertical line that
 * carries the day-gap label and ends in a downward arrowhead, aligned to the
 * side the snake wraps around.
 */
export function TurnConnector({
  gapDays,
  side,
}: {
  gapDays: number | null
  side: 'left' | 'right'
}) {
  return (
    <div
      className="flex flex-col items-center py-2"
      style={{ justifySelf: side === 'right' ? 'end' : 'start' }}
      aria-hidden="true"
    >
      <div className="h-6 w-0.5 rounded-full bg-line-strong" />
      <GapLabel days={gapDays} />
      <div className="h-6 w-0.5 rounded-full bg-line-strong" />
      <Arrowhead dir="down" />
    </div>
  )
}
