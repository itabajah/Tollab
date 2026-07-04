import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App shell', () => {
  it('renders the Tollab brand and subtitle', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Tollab' })).toBeInTheDocument()
    expect(screen.getByText('For Technionez')).toBeInTheDocument()
  })

  it('starts in light theme and toggles to dark and back', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }))
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.click(screen.getByRole('button', { name: /switch to light theme/i }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('persists the chosen theme', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }))
    expect(localStorage.getItem('tollab:ui:theme')).toBe('dark')
  })
})
