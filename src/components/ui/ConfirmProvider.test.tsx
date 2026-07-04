import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmProvider, useConfirm, usePrompt } from './ConfirmProvider'

function Consumer() {
  const confirm = useConfirm()
  const prompt = usePrompt()
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void confirm({
            title: 'Delete course?',
            message: 'This cannot be undone.',
            confirmLabel: 'Delete',
            dangerous: true,
          }).then((ok) => {
            document.title = ok ? 'confirmed' : 'cancelled'
          })
        }}
      >
        ask
      </button>
      <button
        type="button"
        onClick={() => {
          void prompt({
            title: 'Rename tab',
            label: 'Tab name',
            initialValue: 'Lectures 2',
            validate: (v) => (v.trim() ? null : 'Name is required'),
          }).then((value) => {
            document.title = value === null ? 'prompt-cancelled' : `got:${value}`
          })
        }}
      >
        ask-name
      </button>
    </div>
  )
}

function setup() {
  document.title = 'initial'
  return render(
    <ConfirmProvider>
      <Consumer />
    </ConfirmProvider>,
  )
}

describe('useConfirm', () => {
  it('resolves true on confirm', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'ask' }))
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(document.title).toBe('confirmed'))
    expect(screen.queryByText('Delete course?')).not.toBeInTheDocument()
  })

  it('resolves false on cancel', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'ask' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.title).toBe('cancelled'))
  })
})

describe('usePrompt', () => {
  it('returns the edited value on save', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'ask-name' }))
    const input = screen.getByLabelText('Tab name')
    expect(input).toHaveValue('Lectures 2')
    await user.clear(input)
    await user.type(input, 'Workshops')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(document.title).toBe('got:Workshops'))
  })

  it('blocks save and shows the validation error for invalid input', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'ask-name' }))
    await user.clear(screen.getByLabelText('Tab name'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(document.title).toBe('initial') // promise still pending
  })

  it('returns null on cancel', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'ask-name' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.title).toBe('prompt-cancelled'))
  })
})
