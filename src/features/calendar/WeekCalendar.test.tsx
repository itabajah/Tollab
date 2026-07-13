import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekCalendar } from './WeekCalendar'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import { createCourse, type CourseInput } from '@/domain/course'

// 2026-07-01 is a Wednesday.
const NOW = new Date('2026-07-01T10:30:00')

const HEBREW_COURSE = 'מבוא למדעי המחשב'
// The Unicode isolates that fence an RTL run off from its LTR neighbors.
const FSI = '\u2068'
const PDI = '\u2069'

const input: CourseInput = {
  name: 'Algorithms 1',
  number: '',
  points: '',
  lecturer: '',
  faculty: '',
  location: 'Taub 2',
  grade: '',
  syllabus: '',
  notes: '',
  hue: 137,
  exams: { moedA: '', moedB: '' },
  schedule: [{ day: 3, start: '10:00', end: '12:00' }], // Wednesday
}

function setup(seed?: (s: Session) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  session.appStore.getState().addSemester('Summer 2026')
  seed?.(session)
  render(
    <Providers session={session}>
      <WeekCalendar now={NOW} />
    </Providers>,
  )
  return session
}

describe('WeekCalendar', () => {
  it('renders day headers and hour labels from the semester calendar settings', () => {
    setup()
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.queryByText('Sat')).not.toBeInTheDocument() // hidden by default
    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.getByText('19:00')).toBeInTheDocument()
  })

  it('renders a class block positioned on the grid', () => {
    setup((s) => s.appStore.getState().addCourse(createCourse(input, 'colorful')))
    const block = screen.getByRole('button', { name: /Algorithms 1.*10:00.*12:00/ })
    expect(block).toBeInTheDocument()
    // 10:00 with startHour 8 -> row (10-8)*12 + 1 = 25; span (12-10)*12 = 24
    expect(block).toHaveStyle({ gridRowStart: '25' })
  })

  it('opens the course when a class block is clicked', async () => {
    const user = userEvent.setup()
    setup((s) => s.appStore.getState().addCourse(createCourse(input, 'colorful')))
    await user.click(screen.getByRole('button', { name: /Algorithms 1.*10:00/ }))
    expect(screen.getByRole('heading', { name: 'Edit Course' })).toBeInTheDocument()
  })

  it('shows the current-time indicator when now is within the visible range on a visible day', () => {
    setup()
    expect(screen.getByTestId('now-line')).toBeInTheDocument()
  })

  it('hides the now indicator when today is a hidden day', () => {
    // Saturday is hidden by default; pick a Saturday now.
    const session = createSession({
      storage: createMemoryStorage(),
      now: () => new Date('2026-07-04T10:30:00'),
    })
    session.appStore.getState().addSemester('Summer 2026')
    render(
      <Providers session={session}>
        <WeekCalendar now={new Date('2026-07-04T10:30:00')} />
      </Providers>,
    )
    expect(screen.queryByTestId('now-line')).not.toBeInTheDocument()
  })

  it('renders an all-day events row with homework and exam chips', () => {
    setup((s) => {
      const course = createCourse(
        { ...input, exams: { moedA: '2026-07-02', moedB: '' } },
        'colorful',
      )
      course.homework.push({
        id: 'h1',
        title: 'Wet 1',
        dueDate: '2026-07-03',
        completed: false,
        notes: '',
        links: [],
      })
      s.appStore.getState().addCourse(course)
    })
    const eventsRow = screen.getByTestId('all-day-row')
    expect(within(eventsRow).getByText(/Wet 1/)).toBeInTheDocument()
    expect(within(eventsRow).getByText(/Moed A/)).toBeInTheDocument()
  })

  it('deep-links a homework chip to the Homework tab of the course dialog', async () => {
    const user = userEvent.setup()
    setup((s) => {
      const course = createCourse(input, 'colorful')
      course.homework.push({
        id: 'h1',
        title: 'Wet 1',
        dueDate: '2026-07-03',
        completed: false,
        notes: '',
        links: [],
      })
      s.appStore.getState().addCourse(course)
    })
    const eventsRow = screen.getByTestId('all-day-row')
    await user.click(within(eventsRow).getByText(/Wet 1/))
    expect(screen.getByRole('heading', { name: 'Edit Course' })).toBeInTheDocument()
    // The Homework tab is active (its "Show done" toggle only exists there).
    expect(screen.getByLabelText('Show done')).toBeInTheDocument()
  })

  it('deep-links an exam chip to the Details tab of the course dialog', async () => {
    const user = userEvent.setup()
    setup((s) => {
      const course = createCourse(
        { ...input, exams: { moedA: '2026-07-02', moedB: '' } },
        'colorful',
      )
      s.appStore.getState().addCourse(course)
    })
    const eventsRow = screen.getByTestId('all-day-row')
    await user.click(within(eventsRow).getByText(/Moed A/))
    expect(screen.getByRole('heading', { name: 'Edit Course' })).toBeInTheDocument()
    // The Details tab is active (the Moed A field only exists there).
    expect(screen.getByLabelText('Exam date — Moed A')).toBeInTheDocument()
  })

  it('filters to a single day in mobile day mode', async () => {
    const original = window.matchMedia
    // Report the mobile breakpoint as matching so single-day mode engages.
    window.matchMedia = ((query: string) => ({
      matches: query.includes('767.98px'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    try {
      const user = userEvent.setup()
      setup()
      await user.click(screen.getByRole('button', { name: /today only/i }))
      // only the current day's column header (Wed) remains among weekday headers
      expect(screen.getByText('Wed')).toBeInTheDocument()
      expect(screen.queryByText('Sun')).not.toBeInTheDocument()
    } finally {
      window.matchMedia = original
    }
  })

  it('does not collapse to a single day on desktop (single-day mode is mobile-gated)', async () => {
    // Default matchMedia reports no match (desktop). Toggling "today only" must
    // NOT strand the grid on one column with no visible control to restore it.
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /today only/i }))
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
  })

  // Regression: next to a Hebrew course name the tooltip's time range was pulled
  // across it and came back reversed — "12:00–10:00" for a 10:00–12:00 class.
  it('isolates an RTL course name in the class-block tooltip so the time range keeps its order', () => {
    setup((s) =>
      s.appStore.getState().addCourse(createCourse({ ...input, name: HEBREW_COURSE }, 'colorful')),
    )
    const block = screen.getByRole('button', { name: /10:00.*12:00/ })
    expect(block).toHaveAttribute(
      'title',
      `${FSI}${HEBREW_COURSE}${PDI} 10:00–12:00 · ${FSI}Taub 2${PDI}`,
    )
    // Assistive tech reads logically, so the accessible name stays free of controls.
    expect(block).toHaveAttribute('aria-label', `${HEBREW_COURSE} 10:00–12:00`)
  })

  it('isolates the RTL course name and title in an all-day chip tooltip', () => {
    setup((s) => {
      const course = createCourse({ ...input, name: HEBREW_COURSE }, 'colorful')
      course.homework.push({
        id: 'h1',
        title: 'Wet 1',
        dueDate: '2026-07-03',
        completed: false,
        notes: '',
        links: [],
      })
      s.appStore.getState().addCourse(course)
    })
    const chip = within(screen.getByTestId('all-day-row')).getByText(/Wet 1/)
    expect(chip.closest('button')).toHaveAttribute(
      'title',
      `${FSI}${HEBREW_COURSE}${PDI}: ${FSI}Wet 1${PDI}`,
    )
  })

  it('collapses and expands the grid', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.getByRole('grid')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /collapse schedule/i }))
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /expand schedule/i }))
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })
})
