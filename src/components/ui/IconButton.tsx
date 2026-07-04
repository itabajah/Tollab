import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — icon-only buttons must always label themselves. */
  'aria-label': string
  children: ReactNode
  danger?: boolean
}

export function IconButton({ className, danger, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-xs border border-line bg-panel p-2 text-ink-muted transition-colors hover:bg-inset hover:text-ink disabled:cursor-not-allowed disabled:opacity-50',
        danger && 'hover:border-error-border hover:bg-error-bg hover:text-error-border',
        className,
      )}
    />
  )
}
