import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field, Input, Select } from './Field'

describe('Field', () => {
  it('links the label to the control via the render-prop id', async () => {
    const user = userEvent.setup()
    render(<Field label="Name">{(id) => <Input id={id} />}</Field>)
    // getByLabelText resolves through the htmlFor/id association.
    const input = screen.getByLabelText('Name')
    await user.type(input, 'hi')
    expect(input).toHaveValue('hi')
  })

  it('shows the hint when there is no error', () => {
    render(
      <Field label="URL" hint="Paste the link">
        {(id) => <Input id={id} />}
      </Field>,
    )
    expect(screen.getByText('Paste the link')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the error as an alert and suppresses the hint', () => {
    render(
      <Field label="URL" hint="Paste the link" error="Invalid URL">
        {(id) => <Input id={id} aria-invalid />}
      </Field>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid URL')
    expect(screen.queryByText('Paste the link')).not.toBeInTheDocument()
  })
})

describe('Select', () => {
  it('renders its options and changes value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Select aria-label="Day" value="Mon" onChange={onChange}>
        <option value="Sun">Sun</option>
        <option value="Mon">Mon</option>
      </Select>,
    )
    const select = screen.getByRole('combobox', { name: 'Day' })
    await user.selectOptions(select, 'Sun')
    expect(onChange).toHaveBeenCalled()
  })
})
