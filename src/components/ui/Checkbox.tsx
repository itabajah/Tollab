import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { cn } from '@/lib/cn'

export interface CheckboxProps {
  checked: boolean | 'indeterminate'
  onCheckedChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
}

/**
 * Monochrome checkbox — a styled replacement for the raw <input type=checkbox>
 * used across the app. Supports an indeterminate state (for "select all").
 */
export function Checkbox({ checked, onCheckedChange, className, ...props }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      {...props}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-line-strong bg-panel text-on-accent transition-colors ease-standard duration-150',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <RadixCheckbox.Indicator>
        {checked === 'indeterminate' ? (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 6h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2.5 6.5 5 9l4.5-5.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
}
