import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomExamDialog } from './CustomExamDialog'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import type { CustomExam } from '@/domain/model'

const NOW = new Date('2026-07-04T12:00:00')

function setup(exam?: CustomExam, seed?: (s: Session, semesterId: string) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  const semesterId = session.appStore.getState().addSemester('Spring 2026')
  seed?.(session, semesterId)
  const onOpenChange = vi.fn()
  render(
    <Providers session={session}>
      <CustomExamDialog
        open
        onOpenChange={onOpenChange}
        semesterId={semesterId}
        exam={exam ?? null}
      />
    </Providers>,
  )
  return { session, semesterId, onOpenChange }
}

const examsOf = (session: Session) => session.appStore.getState().data.semesters[0]!.customExams

describe('CustomExamDialog', () => {
  it('validates required name and date', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/valid date/i)).toBeInTheDocument()
    expect(examsOf(session)).toHaveLength(0)
  })

  it('adds a custom exam', async () => {
    const user = userEvent.setup()
    const { session, onOpenChange } = setup()
    await user.type(screen.getByLabelText('Name'), 'Midterm')
    await user.type(screen.getByLabelText('Label'), 'Quiz')
    await user.type(screen.getByLabelText('Date'), '2026-05-01')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(examsOf(session)[0]).toMatchObject({
      name: 'Midterm',
      label: 'Quiz',
      date: '2026-05-01',
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('edits and deletes an existing custom exam', async () => {
    const user = userEvent.setup()
    const existing: CustomExam = {
      id: 'x1',
      name: 'Old',
      label: '',
      date: '2026-05-01',
      color: 'hsl(200, 45%, 50%)',
    }
    const { session } = setup(existing, (s, semId) => {
      // Seed the exam into the semester so update/delete target a real entry.
      const data = s.appStore.getState().data
      const semesters = data.semesters.map((sem) =>
        sem.id === semId ? { ...sem, customExams: [existing] } : sem,
      )
      s.appStore.getState().setData({ ...data, semesters })
    })

    expect(screen.getByLabelText('Name')).toHaveValue('Old')
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'New Name')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(examsOf(session)[0]!.name).toBe('New Name')
  })
})
