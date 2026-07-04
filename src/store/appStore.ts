import { createStore } from 'zustand/vanilla'
import { immer } from 'zustand/middleware/immer'
import type { AppData, CalendarSettings, Settings } from '@/domain/model'
import { createSemester, sortSemesters } from '@/domain/semester'
import { generateCourseColor } from '@/domain/colors'
import { newId } from '@/domain/ids'

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
      }
    }),
  )
}
