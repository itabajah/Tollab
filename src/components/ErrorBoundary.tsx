import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * App-root error boundary. Without it, a single render error anywhere below
 * blanks the whole page; here it's caught and replaced with a recoverable
 * fallback. Styled with the global theme tokens (set on <html> before paint),
 * so it renders correctly even though it sits above the provider tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Tollab] Unhandled render error', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-6 text-center">
        <div className="max-w-sm rounded-card border border-line bg-panel p-8 shadow-sm">
          <h1 className="text-lg font-medium text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Tollab hit an unexpected error. Your saved data is safe on this device — reloading the
            page usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center rounded-control bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-[filter] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
          >
            Reload Tollab
          </button>
        </div>
      </div>
    )
  }
}
