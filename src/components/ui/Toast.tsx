import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { newId } from '@/domain/ids'
import { cn } from '@/lib/cn'

/**
 * Toast notifications: bottom-right stack, max 5 visible (oldest evicted), 4s
 * auto-dismiss (6s for errors), colored left bar + status glyph per type, optional
 * action (undo pattern). The auto-dismiss timer pauses while the toast is hovered
 * or focused, and toasts animate out (not just in) before unmounting.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  description?: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastEntry extends ToastOptions {
  id: string
  type: ToastType
  message: string
  /** Resolved auto-dismiss duration (0 = sticky); used to re-arm after hover. */
  duration: number
}

export interface ToastApi {
  show: (type: ToastType, message: string, options?: ToastOptions) => string
  success: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
  warning: (message: string, options?: ToastOptions) => string
  info: (message: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const MAX_VISIBLE = 5
const DEFAULT_DURATION = 4000
const ERROR_DURATION = 6000
// Grace period for the exit animation before the toast is unmounted (a fallback
// for environments — e.g. jsdom — where `animationend` never fires).
const EXIT_MS = 200

const typeStyles: Record<ToastType, { bar: string; icon: string; iconColor: string }> = {
  success: { bar: 'bg-status-success', icon: '✓', iconColor: 'text-status-success' },
  error: { bar: 'bg-status-error', icon: '✕', iconColor: 'text-status-error' },
  warning: { bar: 'bg-status-warning', icon: '!', iconColor: 'text-status-warning' },
  info: { bar: 'bg-status-info', icon: 'i', iconColor: 'text-status-info' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const removals = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const clearFrom = (
    map: React.RefObject<Map<string, ReturnType<typeof setTimeout>>>,
    id: string,
  ) => {
    const t = map.current.get(id)
    if (t !== undefined) {
      clearTimeout(t)
      map.current.delete(id)
    }
  }

  const remove = useCallback((id: string) => {
    clearFrom(timers, id)
    clearFrom(removals, id)
    setLeaving((s) => {
      if (!s.has(id)) return s
      const next = new Set(s)
      next.delete(id)
      return next
    })
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  // Start the exit animation, then unmount after the grace period.
  const beginDismiss = useCallback(
    (id: string) => {
      clearFrom(timers, id)
      setLeaving((s) => (s.has(id) ? s : new Set(s).add(id)))
      if (!removals.current.has(id)) {
        removals.current.set(
          id,
          setTimeout(() => remove(id), EXIT_MS),
        )
      }
    },
    [remove],
  )

  const arm = useCallback(
    (id: string, duration: number) => {
      if (duration <= 0) return
      clearFrom(timers, id)
      timers.current.set(
        id,
        setTimeout(() => beginDismiss(id), duration),
      )
    },
    [beginDismiss],
  )

  useEffect(() => {
    const auto = timers.current
    const exit = removals.current
    return () => {
      for (const t of auto.values()) clearTimeout(t)
      for (const t of exit.values()) clearTimeout(t)
      auto.clear()
      exit.clear()
    }
  }, [])

  const show = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}) => {
      const id = newId()
      const duration = options.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION)
      const entry: ToastEntry = { id, type, message, ...options, duration }
      setToasts((current) => {
        const next = [...current, entry]
        const evicted = next.slice(0, Math.max(0, next.length - MAX_VISIBLE))
        for (const t of evicted) {
          clearFrom(timers, t.id)
          clearFrom(removals, t.id)
        }
        return next.slice(-MAX_VISIBLE)
      })
      arm(id, duration)
      return id
    },
    [arm],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, o) => show('success', m, o),
      error: (m, o) => show('error', m, o),
      warning: (m, o) => show('warning', m, o),
      info: (m, o) => show('info', m, o),
      dismiss: beginDismiss,
    }),
    [show, beginDismiss],
  )

  const pause = useCallback((id: string) => clearFrom(timers, id), [])
  const resume = useCallback((id: string, duration: number) => arm(id, duration), [arm])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            leaving={leaving.has(toast.id)}
            onDismiss={beginDismiss}
            onRemove={remove}
            onPause={pause}
            onResume={resume}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({
  toast,
  leaving,
  onDismiss,
  onRemove,
  onPause,
  onResume,
}: {
  toast: ToastEntry
  leaving: boolean
  onDismiss: (id: string) => void
  onRemove: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string, duration: number) => void
}) {
  const style = typeStyles[toast.type]
  return (
    <div
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id, toast.duration)}
      onFocus={() => onPause(toast.id)}
      onBlur={() => onResume(toast.id, toast.duration)}
      onAnimationEnd={() => {
        if (leaving) onRemove(toast.id)
      }}
      className={cn(
        'pointer-events-auto flex items-stretch overflow-hidden rounded-overlay border border-line bg-panel shadow-lg',
        leaving
          ? 'animate-[toast-out_var(--duration-base)_var(--ease-standard)_forwards]'
          : 'animate-[toast-in_var(--duration-base)_var(--ease-standard)]',
      )}
    >
      <div className={cn('w-1 shrink-0', style.bar)} />
      <div className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5">
        <span className={cn('mt-0.5 text-xs font-bold', style.iconColor)} aria-hidden="true">
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{toast.message}</p>
          {toast.description ? (
            <p className="mt-0.5 text-xs text-ink-muted">{toast.description}</p>
          ) : null}
        </div>
        {toast.action ? (
          <button
            type="button"
            className="shrink-0 rounded-control border border-line-strong px-2 py-0.5 text-xs font-semibold text-ink transition-colors hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            onClick={() => {
              toast.action?.onClick()
              onDismiss(toast.id)
            }}
          >
            {toast.action.label}
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Dismiss notification"
          className="shrink-0 rounded-control text-lg leading-none text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          onClick={() => onDismiss(toast.id)}
        >
          &times;
        </button>
      </div>
    </div>
  )
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (api === null) throw new Error('useToast must be used inside a ToastProvider')
  return api
}
