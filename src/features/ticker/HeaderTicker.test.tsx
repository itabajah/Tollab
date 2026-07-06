import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HeaderTicker } from './HeaderTicker'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import { createCourse, type CourseInput } from '@/domain/course'
import {
  buildTickerItems,
  pickTickerItem,
  tickerSeed,
  HEADER_TICKER_ROTATE_MS,
} from '@/domain/ticker'

// Fixed clock so every ticker build is deterministic (2026-07-04 is a Saturday).
const NOW = new Date('2026-07-04T12:00:00')

const courseInput: CourseInput = {
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

/** Seeds a semester + course with a badly overdue homework so a nudge fires. */
function seedOverdueHomework(session: Session): void {
  const store = session.appStore.getState()
  store.addSemester('Summer 2026')
  const course = createCourse(courseInput, 'colorful')
  store.addCourse(course)
  store.addHomework(course.id, 'Overdue', '2020-01-01')
}

const readText = () => screen.getByTestId('header-ticker-text').textContent ?? ''

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('HeaderTicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    // Undo any document.hidden override so it does not leak across tests.
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  it('renders a live ticker item for the current context', () => {
    const session = makeSession()
    seedOverdueHomework(session)
    render(
      <Providers session={session}>
        <HeaderTicker now={NOW} />
      </Providers>,
    )

    const ticker = screen.getByTestId('header-ticker')
    expect(ticker).toBeInTheDocument()
    // No aria-live: an auto-rotating strip must not re-announce every ~9s.
    expect(ticker).not.toHaveAttribute('aria-live')
    expect(ticker.tagName).toBe('BUTTON')
    expect(readText().trim().length).toBeGreaterThan(0)
    expect(
      screen.getByTestId('header-ticker-badge').textContent?.trim().length ?? 0,
    ).toBeGreaterThan(0)
  })

  it('still renders a setup nudge for a brand-new empty session', () => {
    // No semester exists -> buildTickerItems always yields the no_semester nudge.
    const session = makeSession()
    render(
      <Providers session={session}>
        <HeaderTicker now={NOW} />
      </Providers>,
    )

    expect(screen.getByTestId('header-ticker-badge')).toHaveTextContent('SETUP')
    expect(readText().trim().length).toBeGreaterThan(0)
  })

  it('rotates between items after each rotation interval', () => {
    const session = makeSession()
    seedOverdueHomework(session)
    render(
      <Providers session={session}>
        <HeaderTicker now={NOW} />
      </Providers>,
    )

    const seen = new Set<string>()
    seen.add(readText())
    for (let i = 0; i < 3; i++) {
      advance(HEADER_TICKER_ROTATE_MS)
      seen.add(readText())
    }
    // Multiple distinct items were shown -> rotation is actually advancing.
    expect(seen.size).toBeGreaterThan(1)
  })

  it('pauses rotation while the document is hidden', () => {
    const session = makeSession()
    seedOverdueHomework(session)
    render(
      <Providers session={session}>
        <HeaderTicker now={NOW} />
      </Providers>,
    )

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    const before = readText()
    advance(HEADER_TICKER_ROTATE_MS * 4)
    expect(readText()).toBe(before)
  })

  it('marks a non-actionable item as aria-disabled and does not deep-link on click', async () => {
    const user = userEvent.setup()
    // A brand-new empty session shows the no_semester nudge, whose target is
    // 'none' — there is nothing to open, so clicking must be a no-op.
    const session = makeSession()
    const onSelect = vi.fn()
    render(
      <Providers session={session}>
        <HeaderTicker now={NOW} onSelect={onSelect} />
      </Providers>,
    )

    const ticker = screen.getByTestId('header-ticker')
    expect(ticker).toHaveAttribute('aria-disabled', 'true')
    await user.click(ticker)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('calls onSelect with the current item target when clicked', async () => {
    const user = userEvent.setup()
    const session = makeSession()
    seedOverdueHomework(session)

    // Reproduce the component's initial pick with the public domain helpers.
    const state = session.appStore.getState()
    const semester = state.data.semesters.find((s) => s.id === state.currentSemesterId) ?? null
    const items = buildTickerItems({
      semester,
      now: NOW,
      hasAnySemester: state.data.semesters.length > 0,
    })
    const expected = pickTickerItem(items, { seed: tickerSeed(NOW), recentIds: [] })
    expect(expected).not.toBeNull()

    const onSelect = vi.fn()
    render(
      <Providers session={session}>
        <HeaderTicker now={NOW} onSelect={onSelect} />
      </Providers>,
    )

    await user.click(screen.getByTestId('header-ticker'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(expected!.target)
  })
})
