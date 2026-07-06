import { act, render, screen } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/Toast'
import { SaveErrorWatcher } from './SaveErrorWatcher'
import { notifySaveError } from './saveError'

describe('SaveErrorWatcher', () => {
  it('shows a toast on a save-error event and throttles repeats', () => {
    render(
      <ToastProvider>
        <SaveErrorWatcher />
      </ToastProvider>,
    )

    act(() => notifySaveError())
    expect(screen.getByText(/couldn.t save your changes/i)).toBeInTheDocument()

    // A second immediate failure must not stack a duplicate toast (retries spam).
    act(() => notifySaveError())
    expect(screen.getAllByText(/couldn.t save your changes/i)).toHaveLength(1)
  })
})
