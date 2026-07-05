import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloudStatus } from './CloudStatus'
import { SyncProvider } from '@/hooks/syncContext'
import { ToastProvider } from '@/components/ui/Toast'
import { createSyncController } from '@/store/syncController'
import { createSession } from '@/store/session'
import { createFakeBackend } from '@/services/sync/fakeBackend'
import type { AuthService, AuthUser } from '@/services/firebase/auth'
import { createMemoryStorage } from '@/services/storage/localStore'

const NOW = new Date('2026-07-04T12:00:00Z')

function makeFakeAuth() {
  let user: AuthUser | null = null
  const listeners = new Set<(u: AuthUser | null) => void>()
  const auth: AuthService = {
    currentUser: () => user,
    onChange: (cb) => {
      listeners.add(cb)
      cb(user)
      return () => listeners.delete(cb)
    },
    signIn: async () => {
      user = { uid: 'u1', email: 'me@technion.ac.il' }
      listeners.forEach((l) => l(user))
    },
    signOut: async () => {
      user = null
      listeners.forEach((l) => l(user))
    },
  }
  return auth
}

function renderWithController(controller: ReturnType<typeof createSyncController> | null) {
  return render(
    <ToastProvider>
      <SyncProvider controller={controller}>
        <CloudStatus />
      </SyncProvider>
    </ToastProvider>,
  )
}

function makeController() {
  const storage = createMemoryStorage()
  const session = createSession({ storage, now: () => NOW })
  return createSyncController({
    session,
    storage,
    clientId: 'c',
    auth: makeFakeAuth(),
    now: () => NOW,
    createBackend: () => createFakeBackend(),
  })
}

describe('CloudStatus', () => {
  it('shows an unavailable message when there is no controller', () => {
    renderWithController(null)
    expect(screen.getByText(/unavailable in this build/i)).toBeInTheDocument()
  })

  it('offers Google sign-in when disconnected, and shows the email after connecting', async () => {
    const user = userEvent.setup()
    renderWithController(makeController())
    const button = screen.getByRole('button', { name: /sign in with google/i })
    await user.click(button)
    expect(await screen.findByText('me@technion.ac.il')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
  })

  it('disconnects back to the signed-out state', async () => {
    const user = userEvent.setup()
    renderWithController(makeController())
    await user.click(screen.getByRole('button', { name: /sign in with google/i }))
    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })
})
