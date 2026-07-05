import { render, screen, within } from '@testing-library/react'
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

  const existingExam: CustomExam = {
    id: 'x1',
    name: 'Old',
    label: '',
    date: '2026-05-01',
    color: 'hsl(200, 45%, 50%)',
  }

  function seedExam(hiddenExamIds: string[] = []) {
    return (s: Session, semId: string) => {
      const data = s.appStore.getState().data
      const semesters = data.semesters.map((sem) =>
        sem.id === semId ? { ...sem, customExams: [existingExam], hiddenExamIds } : sem,
      )
      s.appStore.getState().setData({ ...data, semesters })
    }
  }

  it('edits an existing custom exam', async () => {
    const user = userEvent.setup()
    const { session } = setup(existingExam, seedExam())

    expect(screen.getByLabelText('Name')).toHaveValue('Old')
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'New Name')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(examsOf(session)[0]!.name).toBe('New Name')
  })

  it('deletes an existing custom exam after confirmation and clears its hidden id', async () => {
    const user = userEvent.setup()
    const { session, onOpenChange } = setup(existingExam, seedExam(['x1']))

    await user.click(screen.getByRole('button', { name: 'Delete' })) // the dialog's Delete
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete Exam' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    expect(examsOf(session)).toHaveLength(0)
    // removeCustomExam also restores any hidden id that referenced it.
    expect(session.appStore.getState().data.semesters[0]!.hiddenExamIds).not.toContain('x1')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
