import { createAppStore, type AppStore } from './appStore'
import { appDataSchema } from '@/domain/model'
import { createCourse, type CourseInput } from '@/domain/course'

const T1 = new Date('2026-07-04T12:00:00.000Z')

const input: CourseInput = {
  name: 'Algo',
  number: '',
  points: '',
  lecturer: '',
  faculty: '',
  location: '',
  grade: '',
  syllabus: '',
  notes: '',
  hue: 0,
  exams: { moedA: '', moedB: '' },
  schedule: [],
}

function makeStore(): { store: AppStore; courseId: string } {
  const data = appDataSchema.parse({
    semesters: [{ id: 's1', name: 'Spring 2026' }],
    settings: {},
    lastModified: '2026-07-01T00:00:00.000Z',
  })
  const store = createAppStore(data, { now: () => T1 })
  store.getState().selectSemester('s1')
  const course = createCourse(input, 'colorful')
  store.getState().addCourse(course)
  return { store, courseId: course.id }
}

function currentCourse(store: AppStore) {
  return store.getState().data.semesters[0]!.courses[0]!
}

describe('homework actions', () => {
  it('adds, toggles, updates and removes homework', () => {
    const { store, courseId } = makeStore()
    const id = store.getState().addHomework(courseId, 'Wet 1', '2026-06-01')!
    expect(currentCourse(store).homework).toHaveLength(1)
    expect(currentCourse(store).homework[0]!.title).toBe('Wet 1')

    store.getState().toggleHomework(courseId, id)
    expect(currentCourse(store).homework[0]!.completed).toBe(true)

    store.getState().updateHomework(courseId, id, { title: 'Wet 1 (v2)', notes: 'graphs' })
    expect(currentCourse(store).homework[0]!.title).toBe('Wet 1 (v2)')
    expect(currentCourse(store).homework[0]!.notes).toBe('graphs')

    store.getState().removeHomework(courseId, id)
    expect(currentCourse(store).homework).toHaveLength(0)
  })

  it('ignores empty homework titles', () => {
    const { store, courseId } = makeStore()
    store.getState().addHomework(courseId, '   ', '')
    expect(currentCourse(store).homework).toHaveLength(0)
  })

  it('reorders homework and persists the sort order', () => {
    const { store, courseId } = makeStore()
    const a = store.getState().addHomework(courseId, 'A', '')!
    store.getState().addHomework(courseId, 'B', '')
    store.getState().setHomeworkSort(courseId, 'manual')
    store.getState().moveHomework(courseId, a, 1)
    expect(currentCourse(store).homework.map((h) => h.title)).toEqual(['B', 'A'])
    expect(currentCourse(store).homeworkSort).toBe('manual')
  })

  it('manages homework links with auto labels', () => {
    const { store, courseId } = makeStore()
    const id = store.getState().addHomework(courseId, 'HW', '')!
    store.getState().addHomeworkLink(courseId, id, 'https://a.com')
    store.getState().addHomeworkLink(courseId, id, 'https://b.com')
    const links = currentCourse(store).homework[0]!.links
    expect(links.map((l) => l.label)).toEqual(['Link 1', 'Link 2'])
    store.getState().removeHomeworkLink(courseId, id, 0)
    expect(currentCourse(store).homework[0]!.links).toHaveLength(1)
  })

  it('toggles show-completed-homework', () => {
    const { store, courseId } = makeStore()
    store.getState().setShowCompletedHomework(courseId, false)
    expect(currentCourse(store).showCompletedHomework).toBe(false)
  })
})

describe('recording actions', () => {
  it('adds a recording with an auto-generated name', () => {
    const { store, courseId } = makeStore()
    store.getState().addRecording(courseId, 'lectures', 'https://www.youtube.com/watch?v=abc')
    const items = currentCourse(store).recordings.tabs[0]!.items
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Video 1')
    expect(items[0]!.videoLink).toBe('https://www.youtube.com/watch?v=abc')
  })

  it('bulk-adds recordings, honoring provided names and generating blank ones', () => {
    const { store, courseId } = makeStore()
    store.getState().addRecordings(courseId, 'lectures', [
      { name: 'Lecture A', videoLink: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' },
      { videoLink: 'https://www.youtube.com/watch?v=bbbbbbbbbbb' }, // no name -> generated
    ])
    const items = currentCourse(store).recordings.tabs[0]!.items
    expect(items).toHaveLength(2)
    expect(items[0]!.name).toBe('Lecture A')
    expect(items[1]!.name).toBe('Video 2') // generated with running index
  })

  it('bulk-add is a no-op for an empty list but produces new state for a real add', () => {
    const { store, courseId } = makeStore()
    const before = store.getState().data
    store.getState().addRecordings(courseId, 'lectures', [])
    expect(store.getState().data).toBe(before) // untouched — no stamp, no churn
    store
      .getState()
      .addRecordings(courseId, 'lectures', [
        { videoLink: 'https://www.youtube.com/watch?v=ccccccccccc' },
      ])
    expect(store.getState().data).not.toBe(before)
    expect(currentCourse(store).recordings.tabs[0]!.items).toHaveLength(1)
  })

  it('toggles watched, updates and removes recordings', () => {
    const { store, courseId } = makeStore()
    store.getState().addRecording(courseId, 'lectures', '')
    const item = currentCourse(store).recordings.tabs[0]!.items[0]!
    store.getState().toggleRecording(courseId, 'lectures', item.id)
    expect(currentCourse(store).recordings.tabs[0]!.items[0]!.watched).toBe(true)
    store.getState().updateRecording(courseId, 'lectures', item.id, { name: 'Renamed' })
    expect(currentCourse(store).recordings.tabs[0]!.items[0]!.name).toBe('Renamed')
    store.getState().removeRecording(courseId, 'lectures', item.id)
    expect(currentCourse(store).recordings.tabs[0]!.items).toHaveLength(0)
  })

  it('reorders recordings and persists per-tab sort', () => {
    const { store, courseId } = makeStore()
    store.getState().addRecording(courseId, 'lectures', '')
    store
      .getState()
      .updateRecording(
        courseId,
        'lectures',
        currentCourse(store).recordings.tabs[0]!.items[0]!.id,
        { name: 'First' },
      )
    store.getState().addRecording(courseId, 'lectures', '')
    const first = currentCourse(store).recordings.tabs[0]!.items[0]!
    store.getState().setRecordingSort(courseId, 'lectures', 'manual')
    store.getState().moveRecording(courseId, 'lectures', first.id, 1)
    expect(currentCourse(store).recordingsSort.lectures).toBe('manual')
    expect(currentCourse(store).recordings.tabs[0]!.items[1]!.id).toBe(first.id)
  })

  it('manages recording tabs (add/rename/clear/delete), protecting defaults', () => {
    const { store, courseId } = makeStore()
    const tabId = store.getState().addRecordingTab(courseId, 'Workshops')
    expect(currentCourse(store).recordings.tabs.map((t) => t.name)).toContain('Workshops')

    store.getState().addRecording(courseId, tabId, '')
    store.getState().clearRecordingTab(courseId, tabId)
    expect(currentCourse(store).recordings.tabs.find((t) => t.id === tabId)!.items).toHaveLength(0)

    store.getState().renameRecordingTab(courseId, tabId, 'Labs')
    expect(currentCourse(store).recordings.tabs.find((t) => t.id === tabId)!.name).toBe('Labs')

    store.getState().deleteRecordingTab(courseId, tabId)
    expect(currentCourse(store).recordings.tabs.find((t) => t.id === tabId)).toBeUndefined()

    // protected tabs cannot be deleted or renamed
    store.getState().deleteRecordingTab(courseId, 'lectures')
    expect(currentCourse(store).recordings.tabs.find((t) => t.id === 'lectures')).toBeDefined()
    store.getState().renameRecordingTab(courseId, 'lectures', 'Nope')
    expect(currentCourse(store).recordings.tabs.find((t) => t.id === 'lectures')!.name).toBe(
      'Lectures',
    )
  })
})
