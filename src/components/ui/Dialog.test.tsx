import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'

describe('Dialog', () => {
  it('renders the title, body, and footer when open', () => {
    render(
      <Dialog
        open
        onOpenChange={() => {}}
        title="Edit course"
        description="Course editor"
        footer={<button type="button">Save</button>}
      >
        <p>Body content</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Edit course')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('does not render its content while closed', () => {
    render(
      <Dialog open={false} onOpenChange={() => {}} title="Hidden">
        <p>Body content</p>
      </Dialog>,
    )
    expect(screen.queryByText('Body content')).not.toBeInTheDocument()
  })

  it('requests close when the X button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Dialog open onOpenChange={onOpenChange} title="Settings" description="App settings">
        <p>Body</p>
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
