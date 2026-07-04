import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { Providers } from '@/features/app/Providers'
import { createSession } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'

function renderApp() {
  const session = createSession({
    storage: createMemoryStorage(),
    now: () => new Date('2026-07-04T12:00:00'),
  })
  render(
    <Providers session={session}>
      <App />
    </Providers>,
  )
  return session
}

describe('App shell', () => {
  it('renders the Tollab brand and subtitle', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'Tollab' })).toBeInTheDocument()
    expect(screen.getByText('For Technionez')).toBeInTheDocument()
  })

  it('shows the first-run empty state and creates a semester from it', async () => {
    const user = userEvent.setup()
    const session = renderApp()
    expect(screen.getByText(/no semester yet/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create your first semester' }))
    await user.click(screen.getByRole('button', { name: 'Create Semester' }))

    expect(session.appStore.getState().data.semesters).toHaveLength(1)
    expect(screen.queryByText(/no semester yet/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Weekly Schedule' })).toBeInTheDocument()
  })

  it('toggles the theme and persists it in profile settings', async () => {
    const user = userEvent.setup()
    const session = renderApp()
    expect(document.documentElement.dataset.theme).toBe('light')

    await user.click(screen.getByRole('button', { name: /switch to dark theme/i }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(session.appStore.getState().data.settings.theme).toBe('dark')

    await user.click(screen.getByRole('button', { name: /switch to light theme/i }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
