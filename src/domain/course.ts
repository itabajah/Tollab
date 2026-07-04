import {
  courseSchema,
  createDefaultRecordingTabs,
  type Course,
  type ExamDates,
  type ScheduleSlot,
  type Settings,
} from './model'
import { newId } from './ids'
import { courseColorFromHue } from './colors'

/** The editable fields collected by the course form. */
export interface CourseInput {
  name: string
  number: string
  points: string
  lecturer: string
  faculty: string
  location: string
  grade: string
  syllabus: string
  notes: string
  hue: number
  exams: ExamDates
  schedule: ScheduleSlot[]
}

/** Course color from a hue, honoring the grayscale theme (legacy buildCourseData). */
export function buildCourseColor(hue: number, colorTheme: Settings['colorTheme']): string {
  return colorTheme === 'mono' ? 'hsl(0, 0%, 50%)' : courseColorFromHue(hue)
}

/** The detail fields the form owns (everything except id/recordings/homework/sorts). */
export function courseDetailFields(input: CourseInput, colorTheme: Settings['colorTheme']) {
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

export function createCourse(input: CourseInput, colorTheme: Settings['colorTheme']): Course {
  return courseSchema.parse({
    id: newId(),
    ...courseDetailFields(input, colorTheme),
    recordings: { tabs: createDefaultRecordingTabs() },
    homework: [],
  })
}

export function moveCourseInList(courses: readonly Course[], id: string, delta: -1 | 1): Course[] {
  const index = courses.findIndex((c) => c.id === id)
  const target = index + delta
  const next = [...courses]
  if (index === -1 || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

export interface CourseProgress {
  lectures: { watched: number; total: number }
  tutorials: { watched: number; total: number }
  homework: { completed: number; total: number }
}

function tabProgress(course: Course, tabId: string): { watched: number; total: number } {
  const items = course.recordings.tabs.find((t) => t.id === tabId)?.items ?? []
  return { watched: items.filter((i) => i.watched).length, total: items.length }
}

export function courseProgress(course: Course): CourseProgress {
  return {
    lectures: tabProgress(course, 'lectures'),
    tutorials: tabProgress(course, 'tutorials'),
    homework: {
      completed: course.homework.filter((h) => h.completed).length,
      total: course.homework.length,
    },
  }
}

/** `#234247 • 3 pts • Grade: 90%` parts, omitting empties (legacy buildCourseMetaParts). */
export function courseMetaParts(course: Course): string[] {
  const parts: string[] = []
  if (course.number) parts.push(`#${course.number}`)
  if (course.points) parts.push(`${course.points} pts`)
  if (course.grade) parts.push(`Grade: ${course.grade}%`)
  return parts
}
