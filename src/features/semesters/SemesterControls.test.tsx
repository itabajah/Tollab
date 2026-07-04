import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SemesterControls } from './SemesterControls'
import { Providers } from '@/features/app/Providers'
import { createSession } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'

const NOW = new Date('2026-07-04T12:00:00')

function setup(seed?: (session: ReturnType<typeof createSession>) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  seed?.(session)
  const utils = render(
    <Providers session={session}>
      <SemesterControls />
    </Providers>,
  )
  return { session, ...utils }
}

describe('SemesterControls', () => {
  it('lists semesters newest-first and reflects the selection', () => {
    const { session } = setup((s) => {
      s.appStore.getState().addSemester('Spring 2026')
      s.appStore.getState().addSemester('Winter 2026-2027')
      s.appStore.getState().selectSemester(null)
    })
    const select = screen.getByLabelText('Semester') as HTMLSelectElement
    const options = within(select).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Winter 2026-2027', 'Spring 2026'])
    act(() => {
      session.appStore.getState().selectSemester(session.appStore.getState().data.semesters[0]!.id)
    })
    expect(select.value).toBe(session.appStore.getState().data.semesters[0]!.id)
  })

  it('switches semesters via the select', async () => {
    const user = userEvent.setup()
    const { session } = setup((s) => {
      s.appStore.getState().addSemester('Spring 2026')
      s.appStore.getState().addSemester('Winter 2026-2027')
    })
    const springId = session.appStore.getState().data.semesters[0]!.id
    await user.selectOptions(screen.getByLabelText('Semester'), springId)
    expect(session.appStore.getState().currentSemesterId).toBe(springId)
  })

  it('creates a semester from the generated options', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    await user.click(screen.getByRole('button', { name: 'Add semester' }))
    // dialog with generated options; pick one and create
    await user.selectOptions(screen.getByLabelText('Semester name'), 'Winter 2026-2027')
    await user.click(screen.getByRole('button', { name: 'Create Semester' }))
    expect(session.appStore.getState().data.semesters[0]!.name).toBe('Winter 2026-2027')
  })

  it('creates a custom-named semester', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    await user.click(screen.getByRole('button', { name: 'Add semester' }))
    await user.selectOptions(screen.getByLabelText('Semester name'), 'custom')
    await user.type(screen.getByLabelText('Custom name'), 'Exchange Semester')
    await user.click(screen.getByRole('button', { name: 'Create Semester' }))
    expect(session.appStore.getState().data.semesters[0]!.name).toBe('Exchange Semester')
  })

  it('rejects a duplicate semester name', async () => {
    const user = userEvent.setup()
    const { session } = setup((s) => {
      s.appStore.getState().addSemester('Winter 2026-2027')
    })
    await user.click(screen.getByRole('button', { name: 'Add semester' }))
    await user.selectOptions(screen.getByLabelText('Semester name'), 'Winter 2026-2027')
    await user.click(screen.getByRole('button', { name: 'Create Semester' }))
    expect(screen.getByText(/already exists/i)).toBeInTheDocument()
    expect(session.appStore.getState().data.semesters).toHaveLength(1)
  })

  it('deletes the current semester after confirmation', async () => {
    const user = userEvent.setup()
    const { session } = setup((s) => {
      s.appStore.getState().addSemester('Spring 2026')
    })
    await user.click(screen.getByRole('button', { name: 'Delete semester' }))
    expect(screen.getByText(/delete .*spring 2026/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(session.appStore.getState().data.semesters).toHaveLength(0)
  })

  it('hides the delete button when there is no semester', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Delete semester' })).not.toBeInTheDocument()
  })
})
