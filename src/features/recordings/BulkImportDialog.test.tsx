import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkImportDialog } from './BulkImportDialog'
import { Providers } from '@/features/app/Providers'
import { createSession, type Session } from '@/store/session'
import { createMemoryStorage } from '@/services/storage/localStore'
import { createCourse, type CourseInput } from '@/domain/course'
import type { ImportedRecording } from '@/services/importers/recordingsImport'

const NOW = new Date('2026-07-04T12:00:00')

const input: CourseInput = {
  name: 'Algorithms 1',
  number: '234247',
  points: '3',
  lecturer: '',
  faculty: '',
  location: '',
  grade: '',
  syllabus: '',
  notes: '',
  hue: 137,
  exams: { moedA: '', moedB: '' },
  schedule: [],
}

const RESULTS: ImportedRecording[] = [
  { name: 'Lecture 1', videoLink: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
  { name: 'Lecture 2', videoLink: 'https://www.youtube.com/watch?v=bbbbbbbbbbb' },
]

function tabItems(session: Session, tabId: string) {
  const course = session.appStore.getState().data.semesters[0]!.courses[0]!
  return course.recordings.tabs.find((t) => t.id === tabId)!.items
}

function setup(importer: () => Promise<ImportedRecording[]>) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  session.appStore.getState().addSemester('Spring 2026')
  const course = createCourse(input, 'colorful')
  session.appStore.getState().addCourse(course)
  const user = userEvent.setup()
  render(
    <Providers session={session}>
      <BulkImportDialog
        open
        onOpenChange={() => {}}
        courseId={course.id}
        tabId="lectures"
        tabName="Lectures"
        importer={importer}
      />
    </Providers>,
  )
  return { session, user }
}

describe('BulkImportDialog', () => {
  it('fetches a list, lets the user deselect one, and adds the rest', async () => {
    const { session, user } = setup(async () => RESULTS)

    await user.type(
      screen.getByLabelText('YouTube playlist'),
      'https://www.youtube.com/playlist?list=PL123',
    )
    await user.click(screen.getByRole('button', { name: /fetch list/i }))
    // Both results show up, all selected by default.
    expect(await screen.findByText('Lecture 1')).toBeInTheDocument()
    expect(screen.getByText('Lecture 2')).toBeInTheDocument()

    // Deselect the first, then add.
    await user.click(screen.getByRole('checkbox', { name: 'Lecture 1' }))
    await user.click(screen.getByRole('button', { name: /add selected recordings/i }))

    const items = tabItems(session, 'lectures')
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Lecture 2')
  })

  it('generates names when "use original titles" is off', async () => {
    const { session, user } = setup(async () => RESULTS)
    await user.type(
      screen.getByLabelText('YouTube playlist'),
      'https://www.youtube.com/playlist?list=PL123',
    )
    await user.click(screen.getByRole('button', { name: /fetch list/i }))
    await screen.findByText('Lecture 1')
    await user.click(screen.getByRole('checkbox', { name: /use original titles/i }))
    await user.click(screen.getByRole('button', { name: /add selected recordings/i }))

    const items = tabItems(session, 'lectures')
    expect(items.map((i) => i.name)).toEqual(['Video 1', 'Video 2'])
  })

  it('disables the fetch inputs while a fetch is in flight (no overlapping fetches)', async () => {
    let resolve: (v: ImportedRecording[]) => void = () => {}
    let calls = 0
    const importer = () => {
      calls++
      return new Promise<ImportedRecording[]>((r) => {
        resolve = r
      })
    }
    const { user } = setup(importer)
    await user.type(
      screen.getByLabelText('YouTube playlist'),
      'https://www.youtube.com/playlist?list=PL123',
    )
    await user.click(screen.getByRole('button', { name: /fetch list/i }))

    // While busy the source, URL, and fetch button are all disabled, so a second
    // Enter/click can't start an overlapping fetch.
    expect(screen.getByLabelText('YouTube playlist')).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(calls).toBe(1)

    resolve(RESULTS)
    expect(await screen.findByText('Lecture 1')).toBeInTheDocument()
  })

  it('surfaces an import error and adds nothing', async () => {
    const { session, user } = setup(async () => {
      throw new Error('boom')
    })
    await user.type(
      screen.getByLabelText('YouTube playlist'),
      'https://www.youtube.com/playlist?list=PL123',
    )
    await user.click(screen.getByRole('button', { name: /fetch list/i }))
    await waitFor(() => expect(screen.getByText(/could not fetch that link/i)).toBeInTheDocument())
    expect(tabItems(session, 'lectures')).toHaveLength(0)
  })
})
