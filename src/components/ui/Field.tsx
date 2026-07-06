import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'
import { ChevronDownIcon } from './icons'

// Shared control styling: token radius, a visible focus ring, and an automatic
// error affordance when the control carries aria-invalid (callers opt in).
const controlClasses =
  'w-full rounded-control border border-line-strong bg-panel px-2.5 py-1.5 text-sm text-ink transition-colors placeholder:text-ink-faint focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 aria-[invalid=true]:border-error-border aria-[invalid=true]:focus:border-error-border'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClasses, className)} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(controlClasses, 'min-h-20 resize-y', className)} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  // A monochrome custom chevron (native select arrow varies per OS/browser). The
  // caller's className sizes the wrapper (e.g. flex-1); the <select> stays w-full.
  return (
    <div className={cn('relative', className)}>
      <select {...props} className={cn(controlClasses, 'cursor-pointer appearance-none pr-8')}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-faint" />
    </div>
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
  error?: string | null | undefined
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label-caps text-ink-muted">
        {label}
      </label>
      {children(id)}
      {hint && !error ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-error-text">
          {error}
        </p>
      ) : null}
    </div>
  )
}
