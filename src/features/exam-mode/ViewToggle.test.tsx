import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewToggle } from './ViewToggle'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'

const NOW = new Date('2026-07-04T12:00:00')

function setup(seed?: (s: Session) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  session.appStore.getState().addSemester('Spring 2026')
  seed?.(session)
  render(
    <Providers session={session}>
      <ViewToggle now={NOW} />
    </Providers>,
  )
  return session
}

describe('ViewToggle', () => {
  it('defaults to Schedule and hides the Auto chip', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Schedule' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Auto' })).not.toBeInTheDocument()
  })

  it('pins the exam view and reveals the Auto reset chip', async () => {
    const user = userEvent.setup()
    const session = setup()
    await user.click(screen.getByRole('button', { name: 'Exams' }))
    expect(session.appStore.getState().data.semesters[0]!.examViewMode).toBe('exam')
    expect(screen.getByRole('button', { name: 'Exams' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument()
  })

  it('resets to auto', async () => {
    const user = userEvent.setup()
    const session = setup((s) => {
      s.appStore.getState().updateSettings({}) // no-op to ensure store is live
    })
    await user.click(screen.getByRole('button', { name: 'Exams' }))
    await user.click(screen.getByRole('button', { name: 'Auto' }))
    expect(session.appStore.getState().data.semesters[0]!.examViewMode).toBe('auto')
  })
})
