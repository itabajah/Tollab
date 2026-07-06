import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsDialog } from './SettingsDialog'
import { Providers } from '@/features/app/Providers'
import { createSession } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'

const NOW = new Date('2026-07-04T12:00:00')

function setup(seed?: (session: ReturnType<typeof createSession>) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  seed?.(session)
  const onOpenChange = vi.fn()
  const utils = render(
    <Providers session={session}>
      <SettingsDialog open onOpenChange={onOpenChange} />
    </Providers>,
  )
  return { session, onOpenChange, ...utils }
}

describe('SettingsDialog — Profile tab', () => {
  it('shows the active profile and creates a new one', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    expect(screen.getByLabelText('Active profile')).toHaveDisplayValue('Default Profile')

    await user.click(screen.getByRole('button', { name: 'Add profile' }))
    await user.type(screen.getByLabelText('Profile name'), 'Second Degree')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(session.profilesStore.getState().profiles.map((p) => p.name)).toContain('Second Degree')
  })

  it('renames the active profile', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    await user.click(screen.getByRole('button', { name: 'Rename profile' }))
    const input = screen.getByLabelText('Profile name')
    await user.clear(input)
    await user.type(input, 'Main')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(session.profilesStore.getState().profiles[0]!.name).toBe('Main')
  })

  it('deletes the profile after a dangerous confirm', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    const originalId = session.profilesStore.getState().activeProfileId
    await user.click(screen.getByRole('button', { name: 'Delete profile' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    // last profile deleted -> a fresh Default Profile is recreated
    expect(session.profilesStore.getState().activeProfileId).not.toBe(originalId)
  })
})

describe('SettingsDialog — Appearance tab', () => {
  it('shows apply/cancel only after a change, and applies course recoloring', async () => {
    const user = userEvent.setup()
    const { session } = setup((s) => {
      const app = s.appStore.getState()
      app.addSemester('Spring 2026')
    })
    await user.click(screen.getByRole('tab', { name: 'Appearance' }))
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Course colors'), 'mono')
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(session.appStore.getState().data.settings.colorTheme).toBe('mono')
  })

  it('cancel reverts the pending selection', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    await user.click(screen.getByRole('tab', { name: 'Appearance' }))
    await user.selectOptions(screen.getByLabelText('Course colors'), 'single')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(session.appStore.getState().data.settings.colorTheme).toBe('colorful')
    expect(screen.getByLabelText('Course colors')).toHaveValue('colorful')
  })

  it('shows the base hue slider only for the monochromatic scheme', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('tab', { name: 'Appearance' }))
    expect(screen.queryByLabelText('Base hue')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Course colors'), 'single')
    expect(screen.getByLabelText('Base hue')).toBeInTheDocument()
  })
})

describe('SettingsDialog — Fetch Data tab', () => {
  it('shows the ICS import and Technion catalog controls', async () => {
    const user = userEvent.setup()
    setup((s) => s.appStore.getState().addSemester('Spring 2026'))
    await user.click(screen.getByRole('tab', { name: 'Fetch Data' }))
    expect(screen.getByLabelText(/cheesefork.*link/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fetch schedule/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fetch course data/i })).toBeInTheDocument()
  })

  it('reveals the multi-semester range controls when batch is enabled', async () => {
    const user = userEvent.setup()
    setup((s) => s.appStore.getState().addSemester('Spring 2026'))
    await user.click(screen.getByRole('tab', { name: 'Fetch Data' }))

    // Hidden until the batch toggle is checked.
    expect(screen.queryByLabelText('Start season')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText(/fetch multiple semesters/i))

    expect(screen.getByLabelText('Start season')).toBeInTheDocument()
    expect(screen.getByLabelText('End season')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fetch range/i })).toBeInTheDocument()
  })

  it('lets you fetch a schedule before any semester exists (no gate)', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('tab', { name: 'Fetch Data' }))
    // No "create a semester first" gate — the ICS import is available immediately
    // and creates the semester from the link.
    expect(screen.queryByText(/create a semester first/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fetch schedule/i })).toBeInTheDocument()
    // Catalog enrichment needs courses to enrich, so it stays hidden until a semester exists.
    expect(screen.queryByRole('button', { name: /fetch course data/i })).not.toBeInTheDocument()
  })
})

describe('SettingsDialog — Calendar tab', () => {
  it('edits the current semester calendar settings', async () => {
    const user = userEvent.setup()
    const { session } = setup((s) => {
      s.appStore.getState().addSemester('Spring 2026')
    })
    await user.click(screen.getByRole('tab', { name: 'Calendar' }))

    const start = screen.getByLabelText('Start hour')
    await user.clear(start)
    await user.type(start, '9')
    await user.click(screen.getByRole('checkbox', { name: 'Sat' }))
    await user.click(screen.getByRole('button', { name: 'Save calendar settings' }))

    const semester = session.appStore.getState().data.semesters[0]!
    expect(semester.calendarSettings.startHour).toBe(9)
    expect(semester.calendarSettings.visibleDays).toContain(6)
  })

  it('rejects an end hour before the start hour', async () => {
    const user = userEvent.setup()
    const { session } = setup((s) => {
      s.appStore.getState().addSemester('Spring 2026')
    })
    await user.click(screen.getByRole('tab', { name: 'Calendar' }))
    const end = screen.getByLabelText('End hour')
    await user.clear(end)
    await user.type(end, '5')
    await user.click(screen.getByRole('button', { name: 'Save calendar settings' }))
    expect(screen.getByText(/must be after/i)).toBeInTheDocument()
    expect(session.appStore.getState().data.semesters[0]!.calendarSettings.endHour).toBe(20)
  })

  it('shows a hint when no semester exists', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('tab', { name: 'Calendar' }))
    expect(screen.getByText(/create a semester/i)).toBeInTheDocument()
  })

  it('rejects saving with no visible days selected', async () => {
    const user = userEvent.setup()
    const { session } = setup((s) => s.appStore.getState().addSemester('Spring 2026'))
    await user.click(screen.getByRole('tab', { name: 'Calendar' }))
    // Uncheck every default-visible day (Sun–Fri).
    for (const label of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
      await user.click(screen.getByRole('checkbox', { name: label }))
    }
    await user.click(screen.getByRole('button', { name: 'Save calendar settings' }))

    expect(screen.getByText(/select at least one day/i)).toBeInTheDocument()
    // The stored visible-days set is left untouched (no empty-grid save).
    expect(session.appStore.getState().data.semesters[0]!.calendarSettings.visibleDays).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })
})
