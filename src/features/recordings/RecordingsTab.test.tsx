import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordingsTab } from './RecordingsTab'
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

function courseOf(session: Session) {
  return session.appStore.getState().data.semesters[0]!.courses[0]!
}

function tabItems(session: Session, tabId: string) {
  return courseOf(session).recordings.tabs.find((t) => t.id === tabId)!.items
}

function tabNames(session: Session) {
  return courseOf(session).recordings.tabs.map((t) => t.name)
}

function setup(seed?: (session: Session, courseId: string) => void) {
  const session = createSession({ storage: createMemoryStorage(), now: () => NOW })
  session.appStore.getState().addSemester('Spring 2026')
  const course = createCourse(input, 'colorful')
  session.appStore.getState().addCourse(course)
  seed?.(session, course.id)
  const user = userEvent.setup()
  render(
    <Providers session={session}>
      <RecordingsTab courseId={course.id} />
    </Providers>,
  )
  return { session, courseId: course.id, user }
}

describe('RecordingsTab', () => {
  it('renders the default protected sub-tabs and an empty state', () => {
    setup()
    expect(screen.getByRole('button', { name: /lectures/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tutorials/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add tab/i })).toBeInTheDocument()
    expect(screen.getByText(/no recordings in this tab/i)).toBeInTheDocument()
  })

  it('adds a recording and auto-names it "Video 1" for a YouTube link', async () => {
    const { session, user } = setup()
    await user.type(screen.getByLabelText('Video link'), 'https://www.youtube.com/watch?v=abc')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Video 1')).toBeInTheDocument()
    expect(tabItems(session, 'lectures')).toHaveLength(1)
    expect(tabItems(session, 'lectures')[0]!.name).toBe('Video 1')
    expect(tabItems(session, 'lectures')[0]!.videoLink).toBe('https://www.youtube.com/watch?v=abc')
    // Input clears after adding.
    expect(screen.getByLabelText('Video link')).toHaveValue('')
  })

  it('switches between sub-tabs', async () => {
    const { user } = setup((session, courseId) => {
      const store = session.appStore.getState()
      store.addRecording(courseId, 'lectures', 'https://youtu.be/aaa')
      store.addRecording(courseId, 'tutorials', 'https://example.com/tut')
    })

    expect(screen.getByText('Video 1')).toBeInTheDocument()
    expect(screen.queryByText('Tutorial 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /tutorials/i }))

    expect(screen.getByText('Tutorial 1')).toBeInTheDocument()
    expect(screen.queryByText('Video 1')).not.toBeInTheDocument()
  })

  it('adds a custom tab through the prompt', async () => {
    const { session, user } = setup()
    await user.click(screen.getByRole('button', { name: /add tab/i }))
    await user.type(screen.getByLabelText('Tab name'), 'Labs')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('button', { name: /labs/i })).toBeInTheDocument()
    expect(tabNames(session)).toContain('Labs')
  })

  it('renames a custom tab', async () => {
    const { session, user } = setup((session, courseId) => {
      session.appStore.getState().addRecordingTab(courseId, 'Labs')
    })
    await user.click(screen.getByRole('button', { name: /labs/i }))
    await user.click(screen.getByRole('button', { name: /rename tab/i }))

    const nameInput = screen.getByLabelText('Tab name')
    expect(nameInput).toHaveValue('Labs')
    await user.clear(nameInput)
    await user.type(nameInput, 'Workshops')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('button', { name: /workshops/i })).toBeInTheDocument()
    expect(tabNames(session)).toContain('Workshops')
    expect(tabNames(session)).not.toContain('Labs')
  })

  it('clears a custom tab after confirmation', async () => {
    const { session, user } = setup((session, courseId) => {
      const store = session.appStore.getState()
      const tabId = store.addRecordingTab(courseId, 'Labs')
      store.addRecording(courseId, tabId, 'https://youtu.be/x')
    })
    const customTabId = courseOf(session).recordings.tabs[2]!.id

    await user.click(screen.getByRole('button', { name: /labs/i }))
    expect(screen.getByText('Video 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /clear tab/i }))
    await user.click(screen.getByRole('button', { name: 'Clear All' }))

    await waitFor(() => expect(tabItems(session, customTabId)).toHaveLength(0))
    expect(screen.getByText(/no recordings in this tab/i)).toBeInTheDocument()
  })

  it('deletes a custom tab after confirmation and falls back to Lectures', async () => {
    const { session, user } = setup((session, courseId) => {
      session.appStore.getState().addRecordingTab(courseId, 'Labs')
    })
    await user.click(screen.getByRole('button', { name: /labs/i }))
    await user.click(screen.getByRole('button', { name: /delete tab/i }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(tabNames(session)).not.toContain('Labs'))
    expect(screen.queryByRole('button', { name: /labs/i })).not.toBeInTheDocument()
    // Selection returned to the protected Lectures tab (no rename/delete actions).
    expect(screen.queryByRole('button', { name: /rename tab/i })).not.toBeInTheDocument()
  })

  it('hides rename and delete actions for protected tabs but shows them for custom tabs', async () => {
    const { user } = setup((session, courseId) => {
      session.appStore.getState().addRecordingTab(courseId, 'Labs')
    })
    // Lectures (protected) is selected by default.
    expect(screen.queryByRole('button', { name: /rename tab/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete tab/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear tab/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /labs/i }))
    expect(screen.getByRole('button', { name: /rename tab/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete tab/i })).toBeInTheDocument()
  })

  it('toggles the watched state of a recording', async () => {
    const { session, user } = setup((session, courseId) => {
      session.appStore.getState().addRecording(courseId, 'lectures', 'https://youtu.be/x')
    })
    // Keep watched rows visible so we can toggle them off again.
    await user.click(screen.getByRole('checkbox', { name: 'Show watched' }))
    const checkbox = screen.getByRole('checkbox', { name: 'Video 1 watched' })
    await user.click(checkbox)
    expect(tabItems(session, 'lectures')[0]!.watched).toBe(true)
    await user.click(checkbox)
    expect(tabItems(session, 'lectures')[0]!.watched).toBe(false)
  })

  it('hides watched recordings until "Show watched" is enabled', async () => {
    const { user } = setup((session, courseId) => {
      session.appStore.getState().addRecording(courseId, 'lectures', 'https://youtu.be/a')
      const id =
        session.appStore.getState().data.semesters[0]!.courses[0]!.recordings.tabs[0]!.items[0]!.id
      session.appStore.getState().toggleRecording(courseId, 'lectures', id) // mark watched
    })
    // Watched by default is hidden — the row is gone, an explanatory empty state shows.
    expect(screen.queryByText('Video 1')).not.toBeInTheDocument()
    expect(screen.getByText(/all recordings watched/i)).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show watched' }))
    expect(screen.getByText('Video 1')).toBeInTheDocument()
  })

  it('changes the sort order', async () => {
    const { session, user } = setup((session, courseId) => {
      const store = session.appStore.getState()
      store.addRecording(courseId, 'lectures', 'https://youtu.be/a')
      store.addRecording(courseId, 'lectures', 'https://youtu.be/b')
    })
    // Default order is by number: Video 1, Video 2.
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Video 1')

    await user.selectOptions(screen.getByLabelText('Sort recordings'), 'name_desc')

    expect(courseOf(session).recordingsSort['lectures']).toBe('name_desc')
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Video 2')
  })

  it('reorders recordings with the move buttons in manual mode', async () => {
    const { session, user } = setup((session, courseId) => {
      const store = session.appStore.getState()
      store.addRecording(courseId, 'lectures', 'https://youtu.be/a')
      store.addRecording(courseId, 'lectures', 'https://youtu.be/b')
    })
    await user.selectOptions(screen.getByLabelText('Sort recordings'), 'manual')
    await user.click(screen.getByRole('button', { name: 'Move Video 1 down' }))

    expect(tabItems(session, 'lectures').map((i) => i.name)).toEqual(['Video 2', 'Video 1'])
  })

  it('shows an inline embed preview when toggling play, and hides it again', async () => {
    const { user } = setup((session, courseId) => {
      session.appStore
        .getState()
        .addRecording(courseId, 'lectures', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    })
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    const iframe = screen.getByTitle('Video preview')
    expect(iframe.getAttribute('src')).toContain('youtube.com/embed/dQw4w9WgXcQ')

    await user.click(screen.getByRole('button', { name: 'Hide' }))
    expect(screen.queryByTitle('Video preview')).not.toBeInTheDocument()
  })

  it('renders an external link (no preview) for a non-embeddable recording', () => {
    setup((session, courseId) => {
      session.appStore.getState().addRecording(courseId, 'lectures', 'https://example.com/lecture')
    })
    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument()
    expect(screen.queryByTitle('Video preview')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: /open video/i })
    expect(link).toHaveAttribute('href', 'https://example.com/lecture')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('edits a recording name inline', async () => {
    const { session, user } = setup((session, courseId) => {
      session.appStore.getState().addRecording(courseId, 'lectures', 'https://youtu.be/x')
    })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const nameInput = screen.getByLabelText('Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Lecture 5 - Recursion')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(tabItems(session, 'lectures')[0]!.name).toBe('Lecture 5 - Recursion')
    expect(screen.getByText('Lecture 5 - Recursion')).toBeInTheDocument()
  })

  it('deletes a recording after confirmation', async () => {
    const { session, user } = setup((session, courseId) => {
      session.appStore.getState().addRecording(courseId, 'lectures', 'https://youtu.be/x')
    })
    await user.click(screen.getByRole('button', { name: /delete video 1/i }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(tabItems(session, 'lectures')).toHaveLength(0))
    expect(screen.getByText(/no recordings in this tab/i)).toBeInTheDocument()
  })
})
