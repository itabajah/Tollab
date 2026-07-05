import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'default' | 'ghost'
type Size = 'sm' | 'md'

const variantClasses: Record<Variant, string> = {
  default: 'border border-line bg-panel hover:bg-inset',
  ghost: 'border border-transparent bg-transparent hover:bg-inset',
}

const sizeClasses: Record<Size, string> = {
  sm: 'p-1.5',
  md: 'p-2',
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — icon-only buttons must always label themselves. */
  'aria-label': string
  children: ReactNode
  danger?: boolean
  variant?: Variant
  size?: Size
}

/** forwardRef so it composes with Radix `asChild` (e.g. Dialog.Close). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, danger, variant = 'default', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-control text-ink-muted ease-standard transition-[background-color,border-color,color,transform] duration-150 hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        danger && 'hover:border-error-border hover:bg-error-bg hover:text-error-border',
        className,
      )}
    />
  )
})
