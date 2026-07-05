import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'a', label: 'Moed A' },
  { value: 'b', label: 'Moed B' },
] as const

describe('SegmentedControl', () => {
  it('marks the active option pressed and switches on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedControl aria-label="Filter" options={OPTIONS} value="all" onChange={onChange} />,
    )
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Moed A' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Moed B' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('exposes the group label', () => {
    render(<SegmentedControl aria-label="View" options={OPTIONS} value="a" onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument()
  })
})
