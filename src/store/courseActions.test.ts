import { createAppStore } from './appStore'
import { appDataSchema, type AppData } from '@/domain/model'
import { createCourse, type CourseInput } from '@/domain/course'

const T1 = new Date('2026-07-04T12:00:00.000Z')

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

function storeWithSemester(): ReturnType<typeof createAppStore> {
  const data: AppData = appDataSchema.parse({
    semesters: [{ id: 's1', name: 'Spring 2026' }],
    settings: {},
    lastModified: '2026-07-01T00:00:00.000Z',
  })
  const store = createAppStore(data, { now: () => T1 })
  store.getState().selectSemester('s1')
  return store
}

describe('addCourse', () => {
  it('adds a course to the current semester and stamps lastModified', () => {
    const store = storeWithSemester()
    const course = createCourse(input, 'colorful')
    store.getState().addCourse(course)
    const semester = store.getState().data.semesters[0]!
    expect(semester.courses).toHaveLength(1)
    expect(semester.courses[0]!.name).toBe('Algorithms 1')
    expect(store.getState().data.lastModified).toBe(T1.toISOString())
  })
})

describe('updateCourseDetails', () => {
  it('patches detail fields while keeping recordings and homework', () => {
    const store = storeWithSemester()
    const course = createCourse(input, 'colorful')
    store.getState().addCourse(course)
    store.getState().updateCourse(course.id, (draft) => {
      draft.homework.push({
        id: 'h1',
        title: 'HW',
        dueDate: '',
        completed: false,
        notes: '',
        links: [],
      })
    })
    store.getState().updateCourseDetails(course.id, {
      name: 'Algorithms 2',
      color: 'hsl(0, 45%, 50%)',
      number: '234248',
      points: '4',
      lecturer: '',
      faculty: '',
      location: '',
      grade: '',
      syllabus: '',
      notes: '',
      exams: { moedA: '2026-02-01', moedB: '' },
      schedule: [],
    })
    const updated = store.getState().data.semesters[0]!.courses[0]!
    expect(updated.name).toBe('Algorithms 2')
    expect(updated.exams.moedA).toBe('2026-02-01')
    expect(updated.homework).toHaveLength(1)
  })
})

describe('removeCourse / moveCourse', () => {
  it('removes a course', () => {
    const store = storeWithSemester()
    const course = createCourse(input, 'colorful')
    store.getState().addCourse(course)
    store.getState().removeCourse(course.id)
    expect(store.getState().data.semesters[0]!.courses).toHaveLength(0)
  })

  it('reorders courses', () => {
    const store = storeWithSemester()
    const a = createCourse({ ...input, name: 'A' }, 'colorful')
    const b = createCourse({ ...input, name: 'B' }, 'colorful')
    store.getState().addCourse(a)
    store.getState().addCourse(b)
    store.getState().moveCourse(a.id, 1)
    expect(store.getState().data.semesters[0]!.courses.map((c) => c.name)).toEqual(['B', 'A'])
  })
})
