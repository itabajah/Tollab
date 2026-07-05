/** A day-gap chip shown on a roadmap connector (horizontal link or row turn). */
export function GapChip({ days }: { days: number | null }) {
  if (days === null || days <= 0) return null
  return (
    <span className="rounded-full bg-inset px-1.5 py-0.5 text-[9px] font-medium text-ink-faint">
      {days}d
    </span>
  )
}

/** Horizontal connector drawn to the right of a node cell towards its neighbor. */
export function HorizontalConnector({ gapDays }: { gapDays: number | null }) {
  return (
    <div className="pointer-events-none flex items-center justify-center" aria-hidden="true">
      <div className="h-px flex-1 bg-line" />
      <GapChip days={gapDays} />
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}

/** The row-drop turn connector between two serpentine rows. */
export function TurnConnector({
  gapDays,
  side,
}: {
  gapDays: number | null
  side: 'left' | 'right'
}) {
  return (
    <div
      className="flex items-center justify-center py-1"
      style={{ justifySelf: side === 'right' ? 'end' : 'start' }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center">
        <div className="h-3 w-px bg-line" />
        <GapChip days={gapDays} />
        <div className="h-3 w-px bg-line" />
      </div>
    </div>
  )
}
