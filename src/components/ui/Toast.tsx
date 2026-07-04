import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { newId } from '@/domain/ids'
import { cn } from '@/lib/cn'

/**
 * Toast notifications, matching the legacy ToastManager behavior: bottom-right
 * stack, max 5 visible (oldest evicted), 4s auto-dismiss (6s for errors),
 * colored left bar per type, optional action button (undo pattern).
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

const typeStyles: Record<ToastType, { bar: string; icon: string }> = {
  success: { bar: 'bg-status-success', icon: '✓' },
  error: { bar: 'bg-status-error', icon: '✕' },
  warning: { bar: 'bg-status-warning', icon: '!' },
  info: { bar: 'bg-status-info', icon: 'i' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}) => {
      const id = newId()
      const entry: ToastEntry = { id, type, message, ...options }
      setToasts((current) => {
        const next = [...current, entry]
        const evicted = next.slice(0, Math.max(0, next.length - MAX_VISIBLE))
        for (const t of evicted) {
          const timer = timers.current.get(t.id)
          if (timer !== undefined) clearTimeout(timer)
          timers.current.delete(t.id)
        }
        return next.slice(-MAX_VISIBLE)
      })
      const duration = options.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION)
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m, o) => show('success', m, o),
      error: (m, o) => show('error', m, o),
      warning: (m, o) => show('warning', m, o),
      info: (m, o) => show('info', m, o),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastEntry; onDismiss: (id: string) => void }) {
  const style = typeStyles[toast.type]
  return (
    <div
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className="pointer-events-auto flex animate-[toast-in_0.25s_ease-out] items-stretch overflow-hidden rounded-md border border-line bg-panel shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
    >
      <div className={cn('w-1 shrink-0', style.bar)} />
      <div className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5">
        <span className="mt-0.5 text-xs font-bold text-ink-faint" aria-hidden="true">
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
            className="shrink-0 rounded-xs border border-line-strong px-2 py-0.5 text-xs font-semibold text-ink transition-colors hover:bg-inset"
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
          className="shrink-0 text-lg leading-none text-ink-faint transition-colors hover:text-ink"
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
