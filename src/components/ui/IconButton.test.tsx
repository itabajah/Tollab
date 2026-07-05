import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('exposes its accessible name and fires onClick', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <IconButton aria-label="Close" onClick={onClick}>
        <svg />
      </IconButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('forwards its ref to the underlying button (for Radix asChild)', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <IconButton aria-label="Menu" ref={ref}>
        <svg />
      </IconButton>,
    )
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Menu' }))
  })

  it('does not fire onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <IconButton aria-label="Delete" disabled onClick={onClick}>
        <svg />
      </IconButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
