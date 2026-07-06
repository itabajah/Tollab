import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleEditor } from './ScheduleEditor'

describe('ScheduleEditor', () => {
  it('rejects an end time that is not after the start', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ScheduleEditor slots={[]} onChange={onChange} />)

    await user.type(screen.getByLabelText('From'), '12:00')
    await user.type(screen.getByLabelText('To'), '08:00')
    await user.click(screen.getByRole('button', { name: 'Add slot' }))

    expect(screen.getByText(/after the start/i)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('adds a valid slot', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ScheduleEditor slots={[]} onChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('Day'), '1')
    await user.type(screen.getByLabelText('From'), '10:00')
    await user.type(screen.getByLabelText('To'), '12:00')
    await user.click(screen.getByRole('button', { name: 'Add slot' }))

    expect(onChange).toHaveBeenCalledWith([{ day: 1, start: '10:00', end: '12:00' }])
  })

  it('rejects empty times without calling onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ScheduleEditor slots={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Add slot' }))

    expect(screen.getByText(/enter valid times/i)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes an existing slot via its Remove button', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ScheduleEditor slots={[{ day: 1, start: '10:00', end: '12:00' }]} onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: /remove mon 10:00/i }))

    expect(onChange).toHaveBeenCalledWith([])
  })
})
