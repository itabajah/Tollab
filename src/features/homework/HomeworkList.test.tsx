import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeworkList } from './HomeworkList'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import { createCourse, type CourseInput } from '@/domain/course'

const NOW = new Date('2026-07-04T12:00:00')
const HEBREW_COURSE = 'מערכות ספרתיות ומבנה המחשב'

const baseInput: CourseInput = {
  name: 'Course',
  number: '',
  points: '',
  lecturer: '',
  faculty: '',
  location: '',
  grade: '',
  syllabus: '',
  notes: '',
  hue: 200,
  exams: { moedA: '', moedB: '' },
  schedule: [],
}

function addCourse(session: Session, name: string): string {
  session.appStore.getState().addCourse(createCourse({ ...baseInput, name }, 'colorful'))
  const courses = session.appStore.getState().data.semesters[0]!.courses
  return courses[courses.length - 1]!.id
}

function setup(seed?: (s: Session) => void, today: Date = NOW) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  session.appStore.getState().addSemester('Spring 2026')
  seed?.(session)
  render(
    <Providers session={session}>
      <HomeworkList today={today} />
    </Providers>,
  )
  return session
}

describe('HomeworkList', () => {
  it('shows an all-caught-up message when there is no homework', () => {
    setup()
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })

  it('lists incomplete homework across courses sorted by due date (undated last)', () => {
    setup((s) => {
      const cs = addCourse(s, 'Databases')
      const math = addCourse(s, 'Calculus')
      s.appStore.getState().addHomework(cs, 'ER diagram', '2026-07-20')
      s.appStore.getState().addHomework(math, 'Integrals', '2026-07-06')
      s.appStore.getState().addHomework(cs, 'Someday task', '')
    })
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).getByText('Integrals')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('ER diagram')).toBeInTheDocument()
    expect(within(rows[2]!).getByText('Someday task')).toBeInTheDocument()
    // Course names surface in the sidebar.
    expect(within(rows[0]!).getByText('Calculus')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Databases')).toBeInTheDocument()
  })

  it('excludes completed homework', () => {
    setup((s) => {
      const id = addCourse(s, 'Physics')
      const done = s.appStore.getState().addHomework(id, 'Lab report', '2026-07-08')!
      s.appStore.getState().addHomework(id, 'Problem set', '2026-07-09')
      s.appStore.getState().toggleHomework(id, done)
    })
    expect(screen.queryByText('Lab report')).not.toBeInTheDocument()
    expect(screen.getByText('Problem set')).toBeInTheDocument()
  })

  it('completing an item from the sidebar removes it from the list', async () => {
    const user = userEvent.setup()
    const session = setup((s) => {
      const id = addCourse(s, 'Chemistry')
      s.appStore.getState().addHomework(id, 'Titration', '2026-07-10')
    })
    await user.click(screen.getByRole('checkbox', { name: 'Titration' }))
    expect(screen.queryByText('Titration')).not.toBeInTheDocument()
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    expect(session.appStore.getState().data.semesters[0]!.courses[0]!.homework[0]!.completed).toBe(
      true,
    )
  })

  it('reveals completed homework when "Show done" is toggled on', async () => {
    const user = userEvent.setup()
    setup((s) => {
      const id = addCourse(s, 'Physics')
      const done = s.appStore.getState().addHomework(id, 'Lab report', '2026-07-08')!
      s.appStore.getState().toggleHomework(id, done)
    })
    expect(screen.queryByText('Lab report')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show done' }))
    expect(screen.getByText('Lab report')).toBeInTheDocument()
  })

  it('marks a past-due item as overdue', () => {
    setup((s) => {
      const id = addCourse(s, 'History')
      s.appStore.getState().addHomework(id, 'Essay', '2026-06-20')
    })
    expect(screen.getByText(/overdue/i)).toBeInTheDocument()
    const row = screen.getByText('Essay').closest('[data-homework-id]')
    expect(row).toHaveAttribute('data-overdue', 'true')
  })

  // Regression: a Hebrew course name used to swallow the badge's leading digit and
  // render the subtitle as "8 · <hebrew> d left" — the number torn off "d left".
  it('isolates an RTL course name so the due badge cannot be reordered into it', () => {
    setup((s) => {
      const id = addCourse(s, HEBREW_COURSE)
      s.appStore.getState().addHomework(id, 'Wet 1', '2026-07-12') // 8 days out
    })

    // The name resolves as its own bidi run, so the badge that follows it stays a
    // whole, unreordered LTR string.
    const name = screen.getByText(HEBREW_COURSE)
    expect(name.tagName).toBe('BDI')
    expect(getComputedStyle(name).unicodeBidi).toMatch(/isolate/)
    expect(screen.getByText(/8d left/)).toBeInTheDocument()
  })
})
