import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider, useAppState, useAppActions, useProfilesState } from './session'
import { createSession } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'

function makeSession() {
  return createSession({
    storage: createMemoryStorage(),
    now: () => new Date('2026-07-04T12:00:00Z'),
  })
}

function SemesterCount() {
  const count = useAppState((s) => s.data.semesters.length)
  const { addSemester } = useAppActions()
  return (
    <button type="button" onClick={() => addSemester('Spring 2026')}>
      {count} semesters
    </button>
  )
}

function ActiveProfileName() {
  const name = useProfilesState((s) => {
    const active = s.profiles.find((p) => p.id === s.activeProfileId)
    return active?.name ?? '?'
  })
  return <p>{name}</p>
}

describe('SessionProvider bindings', () => {
  it('exposes app state reactively', async () => {
    const user = userEvent.setup()
    render(
      <SessionProvider session={makeSession()}>
        <SemesterCount />
      </SessionProvider>,
    )
    expect(screen.getByRole('button')).toHaveTextContent('0 semesters')
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('1 semesters')
  })

  it('exposes profiles state', () => {
    render(
      <SessionProvider session={makeSession()}>
        <ActiveProfileName />
      </SessionProvider>,
    )
    expect(screen.getByText('Default Profile')).toBeInTheDocument()
  })

  it('throws a helpful error outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<SemesterCount />)).toThrow(/SessionProvider/)
    spy.mockRestore()
  })
})
