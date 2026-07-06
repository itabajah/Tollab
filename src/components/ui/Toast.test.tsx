import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from './Toast'

function Trigger({ onAction }: { onAction?: () => void }) {
  const toast = useToast()
  return (
    <div>
      <button type="button" onClick={() => toast.success('Saved!')}>
        success
      </button>
      <button type="button" onClick={() => toast.error('Broke', { description: 'Oh no' })}>
        error
      </button>
      <button
        type="button"
        onClick={() =>
          toast.info('Hidden', { action: { label: 'Undo', onClick: onAction ?? (() => {}) } })
        }
      >
        with-action
      </button>
      <button type="button" onClick={() => toast.success(`toast-${Math.random()}`)}>
        many
      </button>
    </div>
  )
}

function setup(onAction?: () => void) {
  return render(
    <ToastProvider>
      <Trigger {...(onAction ? { onAction } : {})} />
    </ToastProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastProvider', () => {
  it('shows success and error toasts with descriptions', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'success' }))
    expect(screen.getByText('Saved!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'error' }))
    expect(screen.getByText('Broke')).toBeInTheDocument()
    expect(screen.getByText('Oh no')).toBeInTheDocument()
  })

  it('auto-dismisses after the default duration', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'success' }))
    expect(screen.getByText('Saved!')).toBeInTheDocument()

    // Auto-dismiss fires, then the exit-animation grace period elapses.
    act(() => {
      vi.advanceTimersByTime(4100)
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument()
  })

  it('keeps error toasts longer than success toasts', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'error' }))
    act(() => {
      vi.advanceTimersByTime(4100)
    })
    expect(screen.getByText('Broke')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    // Auto-dismiss has fired; let the exit grace period elapse before unmount.
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByText('Broke')).not.toBeInTheDocument()
  })

  it('runs the action callback (undo) and dismisses', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    setup(onAction)
    await user.click(screen.getByRole('button', { name: 'with-action' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText('Hidden')).not.toBeInTheDocument())
  })

  it('dismisses via the close button', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'success' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    await waitFor(() => expect(screen.queryByText('Saved!')).not.toBeInTheDocument())
  })

  it('pauses the auto-dismiss timer while hovered and resumes on leave', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'success' }))
    const toast = screen.getByRole('status')

    await user.hover(toast)
    act(() => {
      vi.advanceTimersByTime(6000) // well past the 4s default — but paused
    })
    expect(screen.getByText('Saved!')).toBeInTheDocument()

    await user.unhover(toast)
    act(() => {
      vi.advanceTimersByTime(4300) // re-armed timer + exit grace period
    })
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument()
  })

  it('evicts the oldest toast beyond 5 visible', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'success' })) // oldest
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole('button', { name: 'many' }))
    }
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(5)
  })
})
