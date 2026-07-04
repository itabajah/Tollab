import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import type {
  AppData,
  CalendarSettings,
  Course,
  Homework,
  HomeworkSort,
  RecordingSort,
  Settings,
} from '@/domain/model'
import { createSemester, sortSemesters } from '@/domain/semester'
import { generateCourseColor } from '@/domain/colors'
import { courseDetailFields, moveCourseInList, type CourseInput } from '@/domain/course'
import { moveHomework as moveHomeworkList, nextLinkLabel } from '@/domain/homework'
import {
  moveRecording as moveRecordingList,
  generateRecordingName,
  canDeleteTab,
  canRenameTab,
  newCustomTabId,
} from '@/domain/recordings'
import { newId } from '@/domain/ids'

/** Detail fields patched by the course form (everything except id/recordings/homework). */
export type CourseDetailPatch = ReturnType<typeof courseDetailFields>
export type { CourseInput }

/**
 * The per-profile application store: the active profile's AppData plus the
 * selected semester. Every local mutation stamps data.lastModified (used by
 * persistence and the cloud merge); setData does not — incoming profile /
 * remote data is authoritative.
 */
export interface AppStoreState {
  data: AppData
  currentSemesterId: string | null

  setData: (data: AppData) => void
  touch: () => void
  selectSemester: (id: string | null) => void
  addSemester: (name: string) => string
  deleteSemester: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  updateCalendarSettings: (semesterId: string, patch: Partial<CalendarSettings>) => void
  /** Sets the color scheme and regenerates every course color (legacy resetAllColors). */
  applyColorTheme: (colorTheme: Settings['colorTheme'], baseColorHue: number) => void

  // Courses (operate on the current semester)
  addCourse: (course: Course) => void
  removeCourse: (courseId: string) => void
  moveCourse: (courseId: string, delta: -1 | 1) => void
  updateCourseDetails: (courseId: string, patch: CourseDetailPatch) => void
  /** Escape hatch for homework/recording mutations: mutate the course draft in place. */
  updateCourse: (courseId: string, recipe: (course: Course) => void) => void

  // Homework (within a course of the current semester)
  addHomework: (courseId: string, title: string, dueDate: string) => string | null
  updateHomework: (
    courseId: string,
    homeworkId: string,
    patch: Partial<Pick<Homework, 'title' | 'dueDate' | 'notes'>>,
  ) => void
  removeHomework: (courseId: string, homeworkId: string) => void
  toggleHomework: (courseId: string, homeworkId: string) => void
  moveHomework: (courseId: string, homeworkId: string, delta: -1 | 1) => void
  setHomeworkSort: (courseId: string, sort: HomeworkSort) => void
  addHomeworkLink: (courseId: string, homeworkId: string, url: string) => void
  updateHomeworkLink: (
    courseId: string,
    homeworkId: string,
    index: number,
    patch: { label?: string; url?: string },
  ) => void
  removeHomeworkLink: (courseId: string, homeworkId: string, index: number) => void
  setShowCompletedHomework: (courseId: string, show: boolean) => void

  // Recordings
  addRecording: (courseId: string, tabId: string, videoLink: string) => void
  updateRecording: (
    courseId: string,
    tabId: string,
    itemId: string,
    patch: { name?: string; videoLink?: string; slideLink?: string },
  ) => void
  removeRecording: (courseId: string, tabId: string, itemId: string) => void
  toggleRecording: (courseId: string, tabId: string, itemId: string) => void
  moveRecording: (courseId: string, tabId: string, itemId: string, delta: -1 | 1) => void
  setRecordingSort: (courseId: string, tabId: string, sort: RecordingSort) => void
  addRecordingTab: (courseId: string, name: string) => string
  renameRecordingTab: (courseId: string, tabId: string, name: string) => void
  clearRecordingTab: (courseId: string, tabId: string) => void
  deleteRecordingTab: (courseId: string, tabId: string) => void
}

export interface AppStoreOptions {
  now?: () => Date
}

function newestSemesterId(data: AppData): string | null {
  return sortSemesters(data.semesters)[0]?.id ?? null
}

export type AppStore = ReturnType<typeof createAppStore>

export function createAppStore(initial: AppData, options: AppStoreOptions = {}) {
  const now = options.now ?? (() => new Date())

  return createStore<AppStoreState>()(
    immer((set) => {
      const stamp = (draft: { data: AppData }) => {
        draft.data.lastModified = now().toISOString()
      }

      /** Finds a course in the currently-selected semester and mutates it in place. */
      const mutateCourse = (courseId: string, recipe: (course: Course) => void) =>
        set((s) => {
          const semester = s.data.semesters.find((sem) => sem.id === s.currentSemesterId)
          const course = semester?.courses.find((c) => c.id === courseId)
          if (!course) return
          recipe(course)
          stamp(s)
        })

      return {
        data: initial,
        currentSemesterId: newestSemesterId(initial),

        setData: (data) =>
          set((s) => {
            s.data = data
            const stillExists =
              s.currentSemesterId !== null &&
              data.semesters.some((sem) => sem.id === s.currentSemesterId)
            if (!stillExists) s.currentSemesterId = newestSemesterId(data)
          }),

        touch: () => set(stamp),

        selectSemester: (id) =>
          set((s) => {
            s.currentSemesterId = id
          }),

        addSemester: (name) => {
          const semester = createSemester(name, newId())
          set((s) => {
            s.data.semesters.push(semester)
            s.currentSemesterId = semester.id
            stamp(s)
          })
          return semester.id
        },

        deleteSemester: (id) =>
          set((s) => {
            s.data.semesters = s.data.semesters.filter((sem) => sem.id !== id)
            if (s.currentSemesterId === id) {
              s.currentSemesterId = newestSemesterId(s.data)
            }
            stamp(s)
          }),

        updateSettings: (patch) =>
          set((s) => {
            Object.assign(s.data.settings, patch)
            stamp(s)
          }),

        updateCalendarSettings: (semesterId, patch) =>
          set((s) => {
            const semester = s.data.semesters.find((sem) => sem.id === semesterId)
            if (!semester) return
            Object.assign(semester.calendarSettings, patch)
            stamp(s)
          }),

        applyColorTheme: (colorTheme, baseColorHue) =>
          set((s) => {
            s.data.settings.colorTheme = colorTheme
            s.data.settings.baseColorHue = baseColorHue
            for (const semester of s.data.semesters) {
              semester.courses.forEach((course, index) => {
                course.color = generateCourseColor(index, semester.courses.length, {
                  colorTheme,
                  baseColorHue,
                })
              })
            }
            stamp(s)
          }),

        addCourse: (course) =>
          set((s) => {
            const semester = s.data.semesters.find((sem) => sem.id === s.currentSemesterId)
            if (!semester) return
            semester.courses.push(course)
            stamp(s)
          }),

        removeCourse: (courseId) =>
          set((s) => {
            const semester = s.data.semesters.find((sem) => sem.id === s.currentSemesterId)
            if (!semester) return
            semester.courses = semester.courses.filter((c) => c.id !== courseId)
            stamp(s)
          }),

        moveCourse: (courseId, delta) =>
          set((s) => {
            const semester = s.data.semesters.find((sem) => sem.id === s.currentSemesterId)
            if (!semester) return
            semester.courses = moveCourseInList(semester.courses, courseId, delta)
            stamp(s)
          }),

        updateCourseDetails: (courseId, patch) =>
          set((s) => {
            const semester = s.data.semesters.find((sem) => sem.id === s.currentSemesterId)
            const course = semester?.courses.find((c) => c.id === courseId)
            if (!course) return
            Object.assign(course, patch)
            stamp(s)
          }),

        updateCourse: (courseId, recipe) => mutateCourse(courseId, recipe),

        // -- Homework --------------------------------------------------------
        addHomework: (courseId, title, dueDate) => {
          const trimmed = title.trim()
          if (trimmed.length === 0) return null
          const id = newId()
          mutateCourse(courseId, (course) => {
            course.homework.push({
              id,
              title: trimmed,
              dueDate,
              completed: false,
              notes: '',
              links: [],
            })
          })
          return id
        },

        updateHomework: (courseId, homeworkId, patch) =>
          mutateCourse(courseId, (course) => {
            const hw = course.homework.find((h) => h.id === homeworkId)
            if (hw) Object.assign(hw, patch)
          }),

        removeHomework: (courseId, homeworkId) =>
          mutateCourse(courseId, (course) => {
            course.homework = course.homework.filter((h) => h.id !== homeworkId)
          }),

        toggleHomework: (courseId, homeworkId) =>
          mutateCourse(courseId, (course) => {
            const hw = course.homework.find((h) => h.id === homeworkId)
            if (hw) hw.completed = !hw.completed
          }),

        moveHomework: (courseId, homeworkId, delta) =>
          mutateCourse(courseId, (course) => {
            course.homework = moveHomeworkList(course.homework, homeworkId, delta)
          }),

        setHomeworkSort: (courseId, sort) =>
          mutateCourse(courseId, (course) => {
            course.homeworkSort = sort
          }),

        addHomeworkLink: (courseId, homeworkId, url) =>
          mutateCourse(courseId, (course) => {
            const hw = course.homework.find((h) => h.id === homeworkId)
            if (hw) hw.links.push({ label: nextLinkLabel(hw.links), url })
          }),

        updateHomeworkLink: (courseId, homeworkId, index, patch) =>
          mutateCourse(courseId, (course) => {
            const link = course.homework.find((h) => h.id === homeworkId)?.links[index]
            if (link) Object.assign(link, patch)
          }),

        removeHomeworkLink: (courseId, homeworkId, index) =>
          mutateCourse(courseId, (course) => {
            const hw = course.homework.find((h) => h.id === homeworkId)
            if (hw) hw.links = hw.links.filter((_, i) => i !== index)
          }),

        setShowCompletedHomework: (courseId, show) =>
          mutateCourse(courseId, (course) => {
            course.showCompletedHomework = show
          }),

        // -- Recordings ------------------------------------------------------
        addRecording: (courseId, tabId, videoLink) =>
          mutateCourse(courseId, (course) => {
            const tab = course.recordings.tabs.find((t) => t.id === tabId)
            if (!tab) return
            tab.items.push({
              id: newId(),
              name: generateRecordingName(tab.name, videoLink, tab.items.length),
              videoLink,
              slideLink: '',
              watched: false,
            })
          }),

        updateRecording: (courseId, tabId, itemId, patch) =>
          mutateCourse(courseId, (course) => {
            const item = course.recordings.tabs
              .find((t) => t.id === tabId)
              ?.items.find((i) => i.id === itemId)
            if (item) Object.assign(item, patch)
          }),

        removeRecording: (courseId, tabId, itemId) =>
          mutateCourse(courseId, (course) => {
            const tab = course.recordings.tabs.find((t) => t.id === tabId)
            if (tab) tab.items = tab.items.filter((i) => i.id !== itemId)
          }),

        toggleRecording: (courseId, tabId, itemId) =>
          mutateCourse(courseId, (course) => {
            const item = course.recordings.tabs
              .find((t) => t.id === tabId)
              ?.items.find((i) => i.id === itemId)
            if (item) item.watched = !item.watched
          }),

        moveRecording: (courseId, tabId, itemId, delta) =>
          mutateCourse(courseId, (course) => {
            const tab = course.recordings.tabs.find((t) => t.id === tabId)
            if (tab) tab.items = moveRecordingList(tab.items, itemId, delta)
          }),

        setRecordingSort: (courseId, tabId, sort) =>
          mutateCourse(courseId, (course) => {
            course.recordingsSort[tabId] = sort
          }),

        addRecordingTab: (courseId, name) => {
          const id = newCustomTabId()
          mutateCourse(courseId, (course) => {
            course.recordings.tabs.push({ id, name: name.trim() || 'Tab', items: [] })
          })
          return id
        },

        renameRecordingTab: (courseId, tabId, name) =>
          mutateCourse(courseId, (course) => {
            if (!canRenameTab(tabId)) return
            const tab = course.recordings.tabs.find((t) => t.id === tabId)
            if (tab) tab.name = name.trim() || tab.name
          }),

        clearRecordingTab: (courseId, tabId) =>
          mutateCourse(courseId, (course) => {
            const tab = course.recordings.tabs.find((t) => t.id === tabId)
            if (tab) tab.items = []
          }),

        deleteRecordingTab: (courseId, tabId) =>
          mutateCourse(courseId, (course) => {
            if (!canDeleteTab(tabId)) return
            course.recordings.tabs = course.recordings.tabs.filter((t) => t.id !== tabId)
          }),
      }
    }),
  )
}
