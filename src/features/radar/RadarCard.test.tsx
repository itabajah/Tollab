import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadarCard } from './RadarCard'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import { STORAGE_KEYS } from '@/services/storage/keys'
import { createCourse, type CourseInput } from '@/domain/course'
import { RADAR_ROTATE_MS } from '@/domain/radar'

// Fixed clock so every build is deterministic: 2026-03-02 is a Monday.
const NOW = new Date('2026-03-02T11:00:00')
const HEBREW_COURSE = 'אלגברה לינארית'

const baseInput: CourseInput = {
  name: 'Algorithms',
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

function makeSession(): Session {
  return createSession({ storage: createMemoryStorage(), now: () => NOW })
}

function addCourse(session: Session, over: Partial<CourseInput> = {}): string {
  const store = session.appStore.getState()
  store.addCourse(createCourse({ ...baseInput, ...over }, 'colorful'))
  const courses = session.appStore.getState().data.semesters[0]!.courses
  return courses[courses.length - 1]!.id
}

function renderRadar(session: Session, now: Date = NOW) {
  return render(
    <Providers session={session}>
      <RadarCard now={now} />
    </Providers>,
  )
}

const radar = () => screen.getByTestId('radar')
const title = () => screen.getByTestId('radar-title').textContent ?? ''
const quip = () => screen.getByTestId('radar-quip').textContent ?? ''

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function mockMatchMedia(matcher: (query: string) => boolean): () => void {
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    matches: matcher(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

describe('RadarCard', () => {
  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  it('renders the setup nudge for a brand-new session as a non-interactive card', () => {
    renderRadar(makeSession())
    expect(radar()).toHaveAttribute('data-mode', 'live')
    expect(radar()).toHaveAttribute('data-kind', 'no_semester')
    expect(screen.getByTestId('radar-badge')).toHaveTextContent('SETUP')
    expect(title()).toBe('Start with a semester')
    expect(quip().length).toBeGreaterThan(0)
    // Nothing to open, mark done or snooze.
    expect(screen.getByTestId('radar-main').tagName).toBe('DIV')
    expect(screen.queryByRole('button', { name: /snooze/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark .* done/i })).not.toBeInTheDocument()
    expect(radar()).not.toHaveAttribute('aria-live')
  })

  it('pins the most urgent homework with its facts, a course dot and actions', () => {
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const id = addCourse(session, { name: HEBREW_COURSE })
    session.appStore.getState().addHomework(id, 'Wet 1', '2026-03-02')
    session.appStore.getState().addHomework(id, 'Wet 2', '2026-03-05')
    renderRadar(session)

    expect(radar()).toHaveAttribute('data-kind', 'hw_today')
    expect(screen.getByTestId('radar-badge')).toHaveTextContent('HW!')
    expect(title()).toBe('Wet 1')
    const main = screen.getByTestId('radar-main')
    expect(main.tagName).toBe('BUTTON')
    expect(within(main).getByText('due today')).toBeInTheDocument()
    // The Hebrew course name is bidi-isolated in the meta line.
    const name = within(main).getByText(HEBREW_COURSE)
    expect(name.tagName).toBe('BDI')
    expect(screen.getByRole('button', { name: 'Mark Wet 1 done' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Snooze until tomorrow' })).toBeInTheDocument()
    // The second assignment waits in the "up next" rail.
    const chips = screen.getByTestId('radar-chips')
    expect(chips).toHaveTextContent(/up next/i)
    // Chips carry the one fact that matters, so nothing needs promoting just to be read.
    expect(within(chips).getByRole('button', { name: 'Show Wet 2' })).toHaveTextContent(
      'due in 3 days',
    )
  })

  it('marks homework done in place, moves on, and offers an undo', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const id = addCourse(session)
    const hwId = session.appStore.getState().addHomework(id, 'Wet 1', '2026-03-02')!
    session.appStore.getState().addHomework(id, 'Wet 2', '2026-03-05')
    renderRadar(session)

    await user.click(screen.getByRole('button', { name: 'Mark Wet 1 done' }))
    const course = () => session.appStore.getState().data.semesters[0]!.courses[0]!
    expect(course().homework.find((h) => h.id === hwId)?.completed).toBe(true)
    expect(title()).toBe('Wet 2')
    expect(screen.getByRole('status')).toHaveTextContent(/Done: .*Wet 1/)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(course().homework.find((h) => h.id === hwId)?.completed).toBe(false)
    expect(title()).toBe('Wet 1')
  })

  it('snoozes a signal until tomorrow, persists it, and can undo', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const id = addCourse(session)
    session.appStore.getState().addHomework(id, 'Wet 1', '2026-03-02')
    renderRadar(session)
    expect(title()).toBe('Wet 1')

    await user.click(screen.getByRole('button', { name: 'Snooze until tomorrow' }))
    // Only the setup nudge (no class times) is left.
    expect(radar()).toHaveAttribute('data-kind', 'no_schedule')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.RADAR_SNOOZE)!)).toEqual({
      [`hw:${id}:${session.appStore.getState().data.semesters[0]!.courses[0]!.homework[0]!.id}`]:
        '2026-03-02',
    })
    expect(screen.getByRole('status')).toHaveTextContent(/snoozed until tomorrow/i)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(title()).toBe('Wet 1')
    expect(localStorage.getItem(STORAGE_KEYS.RADAR_SNOOZE)).toBeNull()
  })

  it('promotes an "up next" signal to the headline when its chip is clicked', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const a = addCourse(session, { name: 'Physics' })
    const b = addCourse(session, { name: 'Chemistry' })
    session.appStore.getState().addHomework(a, 'Lab 1', '2026-03-01')
    session.appStore.getState().addHomework(b, 'Report', '2026-03-04')
    renderRadar(session)
    expect(title()).toBe('Lab 1')

    await user.click(screen.getByRole('button', { name: 'Show Report' }))
    expect(title()).toBe('Report')
    // The former headline is now a chip, so nothing is hidden.
    expect(screen.getByRole('button', { name: 'Show Lab 1' })).toBeInTheDocument()
    expect(radar()).toHaveAttribute('data-kind', 'hw_soon')
  })

  it('caps the "up next" rail and counts the overflow', () => {
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const a = addCourse(session, { name: 'Physics', exams: { moedA: '2026-03-10', moedB: '' } })
    const b = addCourse(session, { name: 'Chemistry' })
    session.appStore.getState().addHomework(a, 'Lab 1', '2026-03-01')
    session.appStore.getState().addHomework(b, 'Report', '2026-03-04')
    session.appStore.getState().addHomework(b, 'Someday', '')
    session.appStore.getState().addRecording(b, 'lectures', 'https://youtu.be/abc')
    renderRadar(session)

    // Live queue: overdue hw, soon hw, exam, recordings, undated hw, no_schedule.
    expect(title()).toBe('Lab 1')
    const chips = screen.getByTestId('radar-chips')
    expect(within(chips).getAllByRole('button')).toHaveLength(3)
    expect(chips).toHaveTextContent('+2 more')
  })

  it('deep-links the headline into the course dialog on the right tab', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const id = addCourse(session, { name: 'Physics' })
    session.appStore.getState().addHomework(id, 'Lab 1', '2026-03-02')
    renderRadar(session)

    await user.click(screen.getByTestId('radar-main'))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Course' })
    expect(within(dialog).getByRole('tab', { name: 'Homework' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(dialog).getByText('Lab 1')).toBeInTheDocument()
  })

  it('shows a live class with a progress bar and a pulsing badge', () => {
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    addCourse(session, { name: 'Physics', schedule: [{ day: 1, start: '10:00', end: '12:00' }] })
    renderRadar(session)
    expect(radar()).toHaveAttribute('data-kind', 'class_now')
    expect(screen.getByTestId('radar-badge')).toHaveTextContent('LIVE')
    expect(screen.getByTestId('radar-progress')).toHaveStyle({ width: '50%' })
    expect(screen.getByTestId('radar-main')).toHaveTextContent('ends in 1 h')
  })

  it('rotates only the quip in live mode, keeping the headline pinned', () => {
    vi.useFakeTimers()
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    const id = addCourse(session)
    session.appStore.getState().addHomework(id, 'Wet 1', '2026-03-01')
    renderRadar(session)

    const before = quip()
    advance(RADAR_ROTATE_MS)
    expect(quip()).not.toBe(before)
    expect(title()).toBe('Wet 1')
  })

  it('rotates the headline through calm signals when nothing is live', () => {
    vi.useFakeTimers()
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    // A schedule on another day: nothing live, so the card is in calm mode.
    addCourse(session, { schedule: [{ day: 3, start: '10:00', end: '12:00' }] })
    renderRadar(session)
    expect(radar()).toHaveAttribute('data-mode', 'calm')

    const seen = new Set<string>([title()])
    for (let i = 0; i < 3; i++) {
      advance(RADAR_ROTATE_MS)
      seen.add(title())
    }
    expect(seen.size).toBeGreaterThan(1)
    expect(seen.has('No classes today')).toBe(true)
    expect(seen.has('Study tip')).toBe(true)
  })

  it('pauses rotation while the document is hidden or the card is hovered', () => {
    vi.useFakeTimers()
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    addCourse(session, { schedule: [{ day: 3, start: '10:00', end: '12:00' }] })
    renderRadar(session)

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const hiddenTitle = title()
    advance(RADAR_ROTATE_MS * 3)
    expect(title()).toBe(hiddenTitle)

    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    fireEvent.mouseEnter(radar())
    const hoveredTitle = title()
    advance(RADAR_ROTATE_MS * 3)
    expect(title()).toBe(hoveredTitle)

    fireEvent.mouseLeave(radar())
    advance(RADAR_ROTATE_MS)
    expect(title()).not.toBe(hoveredTitle)
  })

  it('stays static under prefers-reduced-motion', () => {
    const restore = mockMatchMedia((q) => q.includes('prefers-reduced-motion'))
    vi.useFakeTimers()
    try {
      const session = makeSession()
      session.appStore.getState().addSemester('Spring 2026')
      addCourse(session, { schedule: [{ day: 3, start: '10:00', end: '12:00' }] })
      renderRadar(session)
      const before = title()
      advance(RADAR_ROTATE_MS * 3)
      expect(title()).toBe(before)
      expect(screen.getByTestId('radar-quip').className).not.toMatch(/radar-in/)
    } finally {
      restore()
    }
  })

  it('tracks the ticking clock: a countdown updates when the minute changes', () => {
    const session = makeSession()
    session.appStore.getState().addSemester('Spring 2026')
    addCourse(session, { name: 'Physics', schedule: [{ day: 1, start: '11:20', end: '13:00' }] })
    const view = renderRadar(session)
    expect(radar()).toHaveAttribute('data-kind', 'class_next')
    expect(screen.getByTestId('radar-main')).toHaveTextContent('in 20 min')
    view.rerender(
      <Providers session={session}>
        <RadarCard now={new Date('2026-03-02T11:08:00')} />
      </Providers>,
    )
    expect(screen.getByTestId('radar-main')).toHaveTextContent('starts in 12 min')
    expect(radar()).toHaveAttribute('data-kind', 'class_soon')
  })
})
