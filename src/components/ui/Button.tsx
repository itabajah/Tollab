import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './icons'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent border border-transparent shadow-xs hover:bg-accent-hover',
  secondary: 'bg-panel text-ink border border-line-strong hover:bg-inset',
  ghost: 'bg-transparent text-ink-muted border border-transparent hover:bg-inset hover:text-ink',
  danger: 'bg-transparent text-error-border border border-error-border hover:bg-error-bg',
  destructive:
    'bg-error-border text-white border border-transparent shadow-xs hover:brightness-110',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Shows a spinner, disables the button, and sets aria-busy. Label stays for SR. */
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-control font-medium ease-standard transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {loading ? <Spinner className="size-3.5 shrink-0" /> : null}
      {children}
    </button>
  )
}
