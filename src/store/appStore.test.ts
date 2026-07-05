import { createAppStore } from './appStore'
import { appDataSchema, createEmptyAppData } from '@/domain/model'

const T0 = '2026-07-01T00:00:00.000Z'
const T1 = new Date('2026-07-04T12:00:00.000Z')

function makeStore(data = createEmptyAppData(T0)) {
  return createAppStore(data, { now: () => T1 })
}

function dataWithSemesters() {
  return appDataSchema.parse({
    semesters: [
      { id: 'spring25', name: 'Spring 2025' },
      { id: 'winter25', name: 'Winter 2025-2026' },
    ],
    settings: {},
    lastModified: T0,
  })
}

describe('createAppStore — initial selection', () => {
  it('selects the newest semester on creation', () => {
    const store = createAppStore(dataWithSemesters(), { now: () => T1 })
    expect(store.getState().currentSemesterId).toBe('winter25')
  })

  it('selects null with no semesters', () => {
    expect(makeStore().getState().currentSemesterId).toBeNull()
  })
})

describe('setData', () => {
  it('replaces data and re-resolves the selected semester', () => {
    const store = makeStore()
    store.getState().setData(dataWithSemesters())
    expect(store.getState().data.semesters).toHaveLength(2)
    expect(store.getState().currentSemesterId).toBe('winter25')
  })

  it('does not stamp lastModified (remote/profile data is authoritative)', () => {
    const store = makeStore()
    const incoming = dataWithSemesters()
    store.getState().setData(incoming)
    expect(store.getState().data.lastModified).toBe(T0)
  })

  it('keeps the current selection when the semester still exists', () => {
    const store = createAppStore(dataWithSemesters(), { now: () => T1 })
    store.getState().selectSemester('spring25')
    store.getState().setData(dataWithSemesters())
    expect(store.getState().currentSemesterId).toBe('spring25')
  })
})

describe('semester actions', () => {
  it('addSemester creates, selects and stamps lastModified', () => {
    const store = makeStore()
    const id = store.getState().addSemester('Winter 2026-2027')
    const state = store.getState()
    expect(state.data.semesters[0]!.name).toBe('Winter 2026-2027')
    expect(state.currentSemesterId).toBe(id)
    expect(state.data.lastModified).toBe(T1.toISOString())
  })

  it('deleteSemester removes and reselects the newest remaining', () => {
    const store = createAppStore(dataWithSemesters(), { now: () => T1 })
    store.getState().deleteSemester('winter25')
    const state = store.getState()
    expect(state.data.semesters.map((s) => s.id)).toEqual(['spring25'])
    expect(state.currentSemesterId).toBe('spring25')
  })

  it('deleteSemester of the last semester selects null', () => {
    const store = makeStore()
    const id = store.getState().addSemester('Spring 2026')
    store.getState().deleteSemester(id)
    expect(store.getState().currentSemesterId).toBeNull()
  })

  it('selectSemester switches the active semester', () => {
    const store = createAppStore(dataWithSemesters(), { now: () => T1 })
    store.getState().selectSemester('spring25')
    expect(store.getState().currentSemesterId).toBe('spring25')
  })
})

describe('applyColorTheme', () => {
  it('updates the scheme and recolors every course by index', () => {
    const data = appDataSchema.parse({
      semesters: [
        {
          id: 's1',
          name: 'Spring 2026',
          courses: [
            { id: 'c1', name: 'A', color: 'hsl(0, 45%, 50%)' },
            { id: 'c2', name: 'B', color: 'hsl(137, 45%, 50%)' },
          ],
        },
      ],
      settings: {},
      lastModified: T0,
    })
    const store = createAppStore(data, { now: () => T1 })
    store.getState().applyColorTheme('mono', 200)
    const state = store.getState()
    expect(state.data.settings.colorTheme).toBe('mono')
    expect(state.data.semesters[0]!.courses.map((c) => c.color)).toEqual([
      'hsl(0, 0%, 50%)',
      'hsl(0, 0%, 50%)',
    ])
  })
})

describe('no-op mutations do not stamp', () => {
  function storeWithCourse() {
    const data = appDataSchema.parse({
      semesters: [
        {
          id: 's1',
          name: 'Spring 2026',
          courses: [{ id: 'c1', name: 'Algo', color: 'hsl(0, 45%, 50%)' }],
        },
      ],
      settings: {},
      lastModified: T0,
    })
    const store = createAppStore(data, { now: () => T1 })
    store.getState().selectSemester('s1')
    return store
  }

  it('leaves lastModified untouched when a course mutation changes nothing', () => {
    const store = storeWithCourse()
    // Renaming a protected tab is blocked → genuine no-op.
    store.getState().renameRecordingTab('c1', 'lectures', 'Hacked')
    expect(store.getState().data.lastModified).toBe(T0)
    // Re-selecting the current sort is also a no-op.
    store.getState().setHomeworkSort('c1', 'date_asc') // already the default
    expect(store.getState().data.lastModified).toBe(T0)
  })

  it('still stamps on a real change', () => {
    const store = storeWithCourse()
    store.getState().setHomeworkSort('c1', 'name_asc')
    expect(store.getState().data.lastModified).toBe(T1.toISOString())
  })
})

describe('settings actions', () => {
  it('updateSettings patches settings and stamps lastModified', () => {
    const store = makeStore()
    store.getState().updateSettings({ theme: 'dark', baseColorHue: 120 })
    const state = store.getState()
    expect(state.data.settings.theme).toBe('dark')
    expect(state.data.settings.baseColorHue).toBe(120)
    expect(state.data.settings.colorTheme).toBe('colorful') // untouched
    expect(state.data.lastModified).toBe(T1.toISOString())
  })

  it('updateCalendarSettings patches only the target semester', () => {
    const store = createAppStore(dataWithSemesters(), { now: () => T1 })
    store.getState().updateCalendarSettings('winter25', { startHour: 10 })
    const [spring, winter] = store.getState().data.semesters
    expect(winter!.calendarSettings.startHour).toBe(10)
    expect(winter!.calendarSettings.endHour).toBe(20)
    expect(spring!.calendarSettings.startHour).toBe(8)
  })
})
