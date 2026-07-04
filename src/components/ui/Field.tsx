import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const controlClasses =
  'w-full rounded-xs border border-line-strong bg-panel px-2.5 py-1.5 text-sm text-ink transition-colors placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClasses, className)} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClasses, 'min-h-20 resize-y', className)} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(controlClasses, 'cursor-pointer', className)}>
      {children}
    </select>
  )
}

/** Uppercase micro-label + control, matching the legacy form language. */
export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: (id: string) => ReactNode
  hint?: string
  error?: string | null
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] tracking-[0.5px] text-ink-muted uppercase">
        {label}
      </label>
      {children(id)}
      {hint && !error ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      {error ? <p className="text-xs text-error-border">{error}</p> : null}
    </div>
  )
}
