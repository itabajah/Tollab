import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  'aria-label': string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * A single canonical segmented toggle (inset track + raised active pill), shared
 * by the schedule/exam view toggle and the Moed filter so they read as one control.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ...aria
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={aria['aria-label']}
      className={cn('inline-flex rounded-control border border-line bg-inset p-0.5', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-xs font-medium ease-standard transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
            value === option.value
              ? 'bg-panel text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
