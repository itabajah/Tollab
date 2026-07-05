import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExamRoadmap } from './ExamRoadmap'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import { createCourse, type CourseInput } from '@/domain/course'
import type { ExamDates } from '@/domain/model'

const NOW = new Date('2026-02-05T12:00:00')

function courseInput(name: string, exams: ExamDates): CourseInput {
  return {
    name,
    number: '',
    points: '',
    lecturer: '',
    faculty: '',
    location: '',
    grade: '',
    syllabus: '',
    notes: '',
    hue: 200,
    exams,
    schedule: [],
  }
}

function setup(seed?: (s: Session) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  session.appStore.getState().addSemester('Winter 2025-2026')
  seed?.(session)
  render(
    <Providers session={session}>
      <ExamRoadmap now={NOW} />
    </Providers>,
  )
  return session
}

function addCourse(session: Session, name: string, exams: ExamDates) {
  session.appStore.getState().addCourse(createCourse(courseInput(name, exams), 'colorful'))
}

describe('ExamRoadmap', () => {
  it('shows an empty state with an add button when there are no exams', () => {
    setup()
    expect(screen.getByText(/no exams yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add custom exam/i })).toBeInTheDocument()
  })

  it('annotates node states and marks the next exam', () => {
    setup((s) => {
      addCourse(s, 'Passed Course', { moedA: '2026-02-01', moedB: '' })
      addCourse(s, 'Today Course', { moedA: '2026-02-05', moedB: '' })
      addCourse(s, 'Future Course', { moedA: '2026-02-10', moedB: '' })
    })
    const passed = screen.getByText('Passed Course').closest('[data-exam-id]')!
    const today = screen.getByText('Today Course').closest('[data-exam-id]')!
    const future = screen.getByText('Future Course').closest('[data-exam-id]')!
    expect(passed).toHaveAttribute('data-state', 'passed')
    expect(today).toHaveAttribute('data-state', 'today')
    expect(future).toHaveAttribute('data-state', 'upcoming')
    // First non-passed is "today" -> it is next.
    expect(today).toHaveAttribute('data-next', 'true')
    expect(future).toHaveAttribute('data-next', 'false')
  })

  it('reports progress as passed/total', () => {
    setup((s) => {
      addCourse(s, 'A', { moedA: '2026-02-01', moedB: '' })
      addCourse(s, 'B', { moedA: '2026-02-10', moedB: '' })
    })
    expect(screen.getByText('1/2 passed')).toBeInTheDocument()
    expect(screen.getByTestId('exam-progress-fill')).toHaveStyle({ width: '50%' })
  })

  it('filters by Moed', async () => {
    const user = userEvent.setup()
    setup((s) => {
      addCourse(s, 'Algo', { moedA: '2026-02-08', moedB: '2026-02-20' })
    })
    // Both moeds present under "All".
    expect(screen.getAllByText('Algo')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Moed B' }))
    const remaining = screen.getAllByText('Algo')
    expect(remaining).toHaveLength(1)
    // The surviving node is the Moed B exam.
    const node = remaining[0]!.closest('[data-exam-id]')!
    expect(node.getAttribute('data-exam-id')).toMatch(/:B$/)
  })

  it('shows a filter-specific message (not the generic empty state) when a filter matches nothing', async () => {
    const user = userEvent.setup()
    setup((s) => addCourse(s, 'OnlyA', { moedA: '2026-02-10', moedB: '' }))
    await user.click(screen.getByRole('button', { name: 'Moed B' }))
    expect(screen.getByText(/no moed b exams/i)).toBeInTheDocument()
    // Not the generic "no exams yet" card — those exams exist, just filtered out.
    expect(screen.queryByRole('button', { name: /add custom exam/i })).not.toBeInTheDocument()
  })

  it('hides a node with an undo toast and restores it from the tray', async () => {
    const user = userEvent.setup()
    const session = setup((s) => {
      addCourse(s, 'Hide Me', { moedA: '2026-02-10', moedB: '' })
    })
    await user.click(screen.getByRole('button', { name: 'Hide Hide Me' }))
    expect(session.appStore.getState().data.semesters[0]!.hiddenExamIds).toHaveLength(1)

    // The undo toast appears, and the node moves to the hidden tray.
    expect(screen.getByText(/hid hide me/i)).toBeInTheDocument()
    const tray = screen.getByTestId('hidden-tray')
    await user.click(within(tray).getByRole('button', { name: 'Restore Hide Me' }))
    expect(session.appStore.getState().data.semesters[0]!.hiddenExamIds).toHaveLength(0)
  })

  it('opens the custom-exam dialog and adds an exam', async () => {
    const user = userEvent.setup()
    const session = setup()
    await user.click(screen.getByRole('button', { name: /add custom exam/i }))
    await user.type(screen.getByLabelText('Name'), 'Physics Quiz')
    await user.type(screen.getByLabelText('Date'), '2026-02-15')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(session.appStore.getState().data.semesters[0]!.customExams[0]!.name).toBe('Physics Quiz')
    expect(screen.getByText('Physics Quiz')).toBeInTheDocument()
  })
})
