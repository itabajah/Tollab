import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CourseList } from './CourseList'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import { createCourse, type CourseInput } from '@/domain/course'

const NOW = new Date('2026-07-04T12:00:00')

const input: CourseInput = {
  name: 'Algorithms 1',
  number: '234247',
  points: '3',
  lecturer: 'Prof. Cohen',
  faculty: 'CS',
  location: 'Taub 2',
  grade: '95',
  syllabus: '',
  notes: '',
  hue: 137,
  exams: { moedA: '', moedB: '' },
  schedule: [],
}

function setup(seed?: (s: Session) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  session.appStore.getState().addSemester('Spring 2026')
  seed?.(session)
  render(
    <Providers session={session}>
      <CourseList />
    </Providers>,
  )
  return session
}

describe('CourseList', () => {
  it('shows an empty state with an add button', () => {
    setup()
    expect(screen.getByText(/no courses yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add course/i })).toBeInTheDocument()
  })

  it('renders course cards with meta and progress', () => {
    setup((s) => {
      s.appStore.getState().addCourse(createCourse(input, 'colorful'))
    })
    expect(screen.getByText('Algorithms 1')).toBeInTheDocument()
    expect(screen.getByText(/#234247/)).toBeInTheDocument()
    expect(screen.getByText(/Grade: 95%/)).toBeInTheDocument()
  })

  it('opens the add-course dialog and creates a course', async () => {
    const user = userEvent.setup()
    const session = setup()
    await user.click(screen.getByRole('button', { name: /add course/i }))
    await user.type(screen.getByLabelText('Course name'), 'Calculus 2')
    await user.click(screen.getByRole('button', { name: 'Save Course' }))
    expect(session.appStore.getState().data.semesters[0]!.courses[0]!.name).toBe('Calculus 2')
  })

  it('saves a free-text syllabus that is not a URL (may embed a link)', async () => {
    const user = userEvent.setup()
    const session = setup()
    await user.click(screen.getByRole('button', { name: /add course/i }))
    await user.type(screen.getByLabelText('Course name'), 'Algorithms 1')
    const syllabus = 'Greedy, DP and network flows. Details: https://example.com/syllabus'
    await user.type(screen.getByLabelText('Syllabus'), syllabus)
    await user.click(screen.getByRole('button', { name: 'Save Course' }))
    const course = session.appStore.getState().data.semesters[0]!.courses[0]!
    expect(course.name).toBe('Algorithms 1')
    expect(course.syllabus).toBe(syllabus)
  })

  it('blocks saving a course with no name', async () => {
    const user = userEvent.setup()
    const session = setup()
    await user.click(screen.getByRole('button', { name: /add course/i }))
    await user.click(screen.getByRole('button', { name: 'Save Course' }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(session.appStore.getState().data.semesters[0]!.courses).toHaveLength(0)
  })

  it('blocks saving a non-numeric grade and shows an inline error', async () => {
    const user = userEvent.setup()
    const session = setup()
    await user.click(screen.getByRole('button', { name: /add course/i }))
    await user.type(screen.getByLabelText('Course name'), 'Physics 1')
    await user.type(screen.getByLabelText('Final grade'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Save Course' }))
    expect(screen.getByText(/grade from 0 to 100/i)).toBeInTheDocument()
    expect(session.appStore.getState().data.semesters[0]!.courses).toHaveLength(0)
  })

  it('edits a course via its card', async () => {
    const user = userEvent.setup()
    const session = setup((s) => {
      s.appStore.getState().addCourse(createCourse(input, 'colorful'))
    })
    await user.click(screen.getByRole('button', { name: /edit algorithms 1/i }))
    // Existing courses open on Recordings (legacy parity); switch to Details to edit.
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    const nameInput = screen.getByLabelText('Course name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Algorithms 1m')
    await user.click(screen.getByRole('button', { name: 'Save Course' }))
    expect(session.appStore.getState().data.semesters[0]!.courses[0]!.name).toBe('Algorithms 1m')
  })

  it('discards edits on cancel and re-seeds from stored data when reopened', async () => {
    const user = userEvent.setup()
    const session = setup((s) => {
      s.appStore.getState().addCourse(createCourse(input, 'colorful'))
    })
    await user.click(screen.getByRole('button', { name: /edit algorithms 1/i }))
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    const nameInput = screen.getByLabelText('Course name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Discarded Name')
    await user.keyboard('{Escape}') // cancel without saving

    expect(session.appStore.getState().data.semesters[0]!.courses[0]!.name).toBe('Algorithms 1')

    // Reopening must show the stored name, not the cancelled edit.
    await user.click(screen.getByRole('button', { name: /edit algorithms 1/i }))
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    expect(screen.getByLabelText('Course name')).toHaveValue('Algorithms 1')
  })

  it('deletes a course after confirmation', async () => {
    const user = userEvent.setup()
    const session = setup((s) => {
      s.appStore.getState().addCourse(createCourse(input, 'colorful'))
    })
    await user.click(screen.getByRole('button', { name: /edit algorithms 1/i }))
    await user.click(screen.getByRole('tab', { name: 'Details' }))
    await user.click(screen.getByRole('button', { name: 'Delete Course' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(session.appStore.getState().data.semesters[0]!.courses).toHaveLength(0)
  })

  it('reorders courses with the move buttons', async () => {
    const user = userEvent.setup()
    const session = setup((s) => {
      s.appStore.getState().addCourse(createCourse({ ...input, name: 'A Course' }, 'colorful'))
      s.appStore.getState().addCourse(createCourse({ ...input, name: 'B Course' }, 'colorful'))
    })
    const firstCard = screen.getByText('A Course').closest('[data-course-card]') as HTMLElement
    await user.click(within(firstCard).getByRole('button', { name: /move.*down/i }))
    expect(session.appStore.getState().data.semesters[0]!.courses.map((c) => c.name)).toEqual([
      'B Course',
      'A Course',
    ])
  })

  it('adds a weekly schedule slot in the form', async () => {
    const user = userEvent.setup()
    const session = setup()
    await user.click(screen.getByRole('button', { name: /add course/i }))
    await user.type(screen.getByLabelText('Course name'), 'Physics 1')
    await user.selectOptions(screen.getByLabelText('Day'), '1')
    await user.type(screen.getByLabelText('From'), '10:30')
    await user.type(screen.getByLabelText('To'), '12:30')
    await user.click(screen.getByRole('button', { name: 'Add slot' }))
    expect(screen.getByText(/Mon 10:30.*12:30/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Course' }))
    expect(session.appStore.getState().data.semesters[0]!.courses[0]!.schedule).toEqual([
      { day: 1, start: '10:30', end: '12:30' },
    ])
  })
})
