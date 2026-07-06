import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeworkTab } from './HomeworkTab'
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
  grade: '',
  syllabus: '',
  notes: '',
  hue: 137,
  exams: { moedA: '', moedB: '' },
  schedule: [],
}

function setup(seed?: (s: Session, courseId: string) => void, today: Date = NOW) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  const st = session.appStore.getState()
  st.addSemester('Spring 2026')
  st.addCourse(createCourse(input, 'colorful'))
  const courseId = session.appStore.getState().data.semesters[0]!.courses[0]!.id
  seed?.(session, courseId)
  render(
    <Providers session={session}>
      <HomeworkTab courseId={courseId} today={today} />
    </Providers>,
  )
  return { session, courseId }
}

const homeworkOf = (session: Session) =>
  session.appStore.getState().data.semesters[0]!.courses[0]!.homework

describe('HomeworkTab', () => {
  it('renders an empty state and a disabled Add button', () => {
    setup()
    expect(screen.getByText(/no assignments yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add assignment' })).toBeDisabled()
  })

  it('adds an assignment and clears the input', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    await user.type(screen.getByLabelText('Assignment'), 'Read chapter 3')
    const addButton = screen.getByRole('button', { name: 'Add assignment' })
    expect(addButton).toBeEnabled()
    await user.click(addButton)

    expect(homeworkOf(session).map((h) => h.title)).toEqual(['Read chapter 3'])
    expect(screen.getByLabelText('Assignment')).toHaveValue('')
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).getByText('Read chapter 3')).toBeInTheDocument()
  })

  it('is a no-op for an empty (whitespace-only) title', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    await user.type(screen.getByLabelText('Assignment'), '   ')
    expect(screen.getByRole('button', { name: 'Add assignment' })).toBeDisabled()
    expect(homeworkOf(session)).toHaveLength(0)
  })

  it('hides a completed item when "Show done" is off', async () => {
    const user = userEvent.setup()
    setup((s, id) => {
      s.appStore.getState().addHomework(id, 'Physics HW', '')
    })
    expect(screen.getByText('Physics HW')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show done' }))
    // Still incomplete -> still visible.
    expect(screen.getByText('Physics HW')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Physics HW' }))
    expect(screen.queryByText('Physics HW')).not.toBeInTheDocument()
  })

  it('keeps a deep-linked completed item visible even when "Show done" is off', () => {
    const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
    const st = session.appStore.getState()
    st.addSemester('Spring 2026')
    st.addCourse(createCourse(input, 'colorful'))
    const courseId = session.appStore.getState().data.semesters[0]!.courses[0]!.id
    st.addHomework(courseId, 'Linked HW', '')
    const hwId = session.appStore.getState().data.semesters[0]!.courses[0]!.homework[0]!.id
    st.toggleHomework(courseId, hwId) // complete it
    st.setShowCompletedHomework(courseId, false) // and hide done items

    render(
      <Providers session={session}>
        <HomeworkTab courseId={courseId} today={NOW} highlightId={hwId} />
      </Providers>,
    )
    // The deep-link target must still mount so its scroll/pulse can fire.
    expect(screen.getByText('Linked HW')).toBeInTheDocument()
  })

  it('reflects a change in sort order in the DOM', async () => {
    const user = userEvent.setup()
    setup((s, id) => {
      s.appStore.getState().addHomework(id, 'Zeta', '2026-07-05')
      s.appStore.getState().addHomework(id, 'Alpha', '2026-07-25')
    })
    // Default is date_asc -> Zeta (Jul 5) before Alpha (Jul 25).
    let rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).getByText('Zeta')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Alpha')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'name_asc')

    rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).getByText('Alpha')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Zeta')).toBeInTheDocument()
  })

  it('shows reorder buttons only in manual mode and moves an item', async () => {
    const user = userEvent.setup()
    const { session } = setup((s, id) => {
      s.appStore.getState().addHomework(id, 'One', '')
      s.appStore.getState().addHomework(id, 'Two', '')
    })
    expect(screen.queryByRole('button', { name: /move .* down/i })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'manual')
    await user.click(screen.getByRole('button', { name: 'Move One down' }))

    expect(homeworkOf(session).map((h) => h.title)).toEqual(['Two', 'One'])
  })

  it('adds and removes links with auto "Link N" labels', async () => {
    const user = userEvent.setup()
    const { session } = setup((s, id) => {
      s.appStore.getState().addHomework(id, 'HW L', '')
    })
    await user.click(screen.getByRole('button', { name: 'Edit HW L' }))

    await user.type(screen.getByLabelText('Link URL'), 'https://a.example')
    await user.click(screen.getByRole('button', { name: 'Add link' }))
    expect(screen.getByRole('link', { name: 'Link 1' })).toBeInTheDocument()
    expect(homeworkOf(session)[0]!.links).toEqual([{ label: 'Link 1', url: 'https://a.example' }])

    await user.type(screen.getByLabelText('Link URL'), 'https://b.example')
    await user.click(screen.getByRole('button', { name: 'Add link' }))
    expect(screen.getByRole('link', { name: 'Link 2' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Link 1' }))
    expect(homeworkOf(session)[0]!.links).toEqual([{ label: 'Link 2', url: 'https://b.example' }])
    expect(screen.queryByRole('link', { name: 'Link 1' })).not.toBeInTheDocument()
  })

  it('edits the title and notes through the expanded section', async () => {
    const user = userEvent.setup()
    const { session } = setup((s, id) => {
      s.appStore.getState().addHomework(id, 'Draft', '')
    })
    await user.click(screen.getByRole('button', { name: 'Edit Draft' }))
    await user.type(screen.getByLabelText('Notes'), 'remember appendix')
    expect(homeworkOf(session)[0]!.notes).toBe('remember appendix')
  })

  it('deletes an assignment after confirmation and shows a toast', async () => {
    const user = userEvent.setup()
    const { session } = setup((s, id) => {
      s.appStore.getState().addHomework(id, 'Del HW', '')
    })
    await user.click(screen.getByRole('button', { name: 'Delete Del HW' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(homeworkOf(session)).toHaveLength(0)
    expect(screen.queryByText('Del HW')).not.toBeInTheDocument()
    expect(screen.getByText('Assignment deleted')).toBeInTheDocument()
  })

  it('keeps the item when the delete confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const { session } = setup((s, id) => {
      s.appStore.getState().addHomework(id, 'Keep HW', '')
    })
    await user.click(screen.getByRole('button', { name: 'Delete Keep HW' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(homeworkOf(session)).toHaveLength(1)
  })

  it('marks a past-due incomplete item as overdue', () => {
    setup((s, id) => {
      s.appStore.getState().addHomework(id, 'Old HW', '2026-06-01')
    })
    expect(screen.getByText(/overdue/i)).toBeInTheDocument()
    const row = screen.getByText('Old HW').closest('[data-homework-id]')
    expect(row).toHaveAttribute('data-overdue', 'true')
  })
})
