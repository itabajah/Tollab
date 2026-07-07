import { cn } from '@/lib/cn'

interface ProgressBarProps {
  /**
   * Completed amount, 0..`max`. Omit for an *indeterminate* bar (a sweeping
   * segment) when the total duration is unknown — e.g. a single network fetch.
   */
  value?: number
  max?: number
  label: string
  className?: string
}

/**
 * A slim monochrome progress track. Determinate when given a `value` (fills to
 * `value/max`); indeterminate otherwise (a segment sweeps to signal activity).
 * Reduced-motion users get a static bar via the global motion reset.
 */
export function ProgressBar({ value, max = 100, label, className }: ProgressBarProps) {
  const indeterminate = value === undefined
  const pct = indeterminate ? 0 : Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div
      role="progressbar"
      aria-label={label}
      {...(indeterminate
        ? {}
        : { 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': value })}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-inset', className)}
    >
      {indeterminate ? (
        <span className="absolute inset-y-0 w-2/5 rounded-full bg-accent [animation:progress-sweep_1.1s_ease-in-out_infinite]" />
      ) : (
        <span
          className="block h-full rounded-full bg-accent transition-[width] duration-300 ease-standard"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  )
}
