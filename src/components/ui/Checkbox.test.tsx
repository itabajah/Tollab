import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Checkbox } from './Checkbox'

function Controlled({ initial = false }: { initial?: boolean }) {
  const [checked, setChecked] = useState(initial)
  return <Checkbox aria-label="Watched" checked={checked} onCheckedChange={setChecked} />
}

describe('Checkbox', () => {
  it('toggles on click', async () => {
    const user = userEvent.setup()
    render(<Controlled />)
    const box = screen.getByRole('checkbox', { name: 'Watched' })
    expect(box).toHaveAttribute('aria-checked', 'false')
    await user.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
    await user.click(box)
    expect(box).toHaveAttribute('aria-checked', 'false')
  })

  it('reports an indeterminate state', () => {
    render(<Checkbox aria-label="All" checked="indeterminate" onCheckedChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'All' })).toHaveAttribute('aria-checked', 'mixed')
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Checkbox aria-label="Locked" checked={false} disabled onCheckedChange={onChange} />)
    await user.click(screen.getByRole('checkbox', { name: 'Locked' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
