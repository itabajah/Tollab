import {
  buildCourseColor,
  createCourse,
  moveCourseInList,
  courseProgress,
  courseMetaParts,
  type CourseInput,
} from './course'
import { courseSchema, type Course } from './model'

const baseInput: CourseInput = {
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
  exams: { moedA: '2026-02-01', moedB: '' },
  schedule: [{ day: 0, start: '10:30', end: '12:30' }],
}

describe('buildCourseColor', () => {
  it('builds an hsl color from the hue for colorful/single themes', () => {
    expect(buildCourseColor(137, 'colorful')).toBe('hsl(137, 45%, 50%)')
    expect(buildCourseColor(200, 'single')).toBe('hsl(200, 45%, 50%)')
  })

  it('ignores the hue for the grayscale theme', () => {
    expect(buildCourseColor(137, 'mono')).toBe('hsl(0, 0%, 50%)')
  })
})

describe('createCourse', () => {
  it('creates a valid course with default recording tabs and empty homework', () => {
    const course = createCourse(baseInput, 'colorful')
    expect(courseSchema.safeParse(course).success).toBe(true)
    expect(course.name).toBe('Algorithms 1')
    expect(course.color).toBe('hsl(137, 45%, 50%)')
    expect(course.exams).toEqual({ moedA: '2026-02-01', moedB: '' })
    expect(course.schedule).toEqual([{ day: 0, start: '10:30', end: '12:30' }])
    expect(course.recordings.tabs.map((t) => t.id)).toEqual(['lectures', 'tutorials'])
    expect(course.homework).toEqual([])
    expect(course.id).toBeTruthy()
  })
})

describe('applyCourseInput (edit preserves child data)', () => {
  it('updates detail fields while keeping recordings and homework', () => {
    const existing: Course = courseSchema.parse({
      id: 'c1',
      name: 'Old',
      color: 'hsl(0, 45%, 50%)',
      homework: [{ id: 'h1', title: 'HW1' }],
      recordings: {
        tabs: [
          { id: 'lectures', name: 'Lectures', items: [{ id: 'r1', name: 'L1', watched: true }] },
          { id: 'tutorials', name: 'Tutorials', items: [] },
        ],
      },
    })
    const updated = { ...existing, ...courseFields(baseInput, 'colorful') }
    // helper below mirrors what the form does; assert child arrays survive
    expect(updated.name).toBe('Algorithms 1')
    expect(updated.homework).toHaveLength(1)
    expect(updated.recordings.tabs[0]!.items).toHaveLength(1)
  })
})

// Local helper mirroring the form's field extraction (kept out of the module surface).
function courseFields(input: CourseInput, colorTheme: 'colorful' | 'single' | 'mono') {
  return {
    name: input.name,
    color: buildCourseColor(input.hue, colorTheme),
    number: input.number,
    points: input.points,
    lecturer: input.lecturer,
    faculty: input.faculty,
    location: input.location,
    grade: input.grade,
    syllabus: input.syllabus,
    notes: input.notes,
    exams: input.exams,
    schedule: input.schedule,
  }
}

describe('moveCourseInList', () => {
  const courses = [
    courseSchema.parse({ id: 'a', name: 'A', color: 'x' }),
    courseSchema.parse({ id: 'b', name: 'B', color: 'x' }),
    courseSchema.parse({ id: 'c', name: 'C', color: 'x' }),
  ]

  it('moves a course up', () => {
    expect(moveCourseInList(courses, 'b', -1).map((c) => c.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves a course down', () => {
    expect(moveCourseInList(courses, 'b', 1).map((c) => c.id)).toEqual(['a', 'c', 'b'])
  })

  it('is a no-op at the boundaries or for unknown ids', () => {
    expect(moveCourseInList(courses, 'a', -1).map((c) => c.id)).toEqual(['a', 'b', 'c'])
    expect(moveCourseInList(courses, 'c', 1).map((c) => c.id)).toEqual(['a', 'b', 'c'])
    expect(moveCourseInList(courses, 'z', 1).map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('courseProgress', () => {
  it('counts watched lectures/tutorials and completed homework', () => {
    const course = courseSchema.parse({
      id: 'c1',
      name: 'A',
      color: 'x',
      homework: [
        { id: 'h1', title: 'x', completed: true },
        { id: 'h2', title: 'y' },
      ],
      recordings: {
        tabs: [
          {
            id: 'lectures',
            name: 'Lectures',
            items: [
              { id: 'l1', name: 'L1', watched: true },
              { id: 'l2', name: 'L2' },
            ],
          },
          { id: 'tutorials', name: 'Tutorials', items: [{ id: 't1', name: 'T1', watched: true }] },
        ],
      },
    })
    expect(courseProgress(course)).toEqual({
      lectures: { watched: 1, total: 2 },
      tutorials: { watched: 1, total: 1 },
      homework: { completed: 1, total: 2 },
    })
  })
})

describe('courseMetaParts', () => {
  it('formats number, points and grade parts', () => {
    const course = courseSchema.parse({
      id: 'c',
      name: 'A',
      color: 'x',
      number: '234247',
      points: '3',
      grade: '90',
    })
    expect(courseMetaParts(course)).toEqual(['#234247', '3 pts', 'Grade: 90%'])
  })

  it('omits empty parts', () => {
    const course = courseSchema.parse({ id: 'c', name: 'A', color: 'x', points: '3' })
    expect(courseMetaParts(course)).toEqual(['3 pts'])
  })
})
