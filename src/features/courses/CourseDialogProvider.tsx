import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAppState } from '@/hooks/session'
import { CourseFormDialog } from './CourseFormDialog'

/** Which tab of the course dialog to open on. */
export type CourseTab = 'recordings' | 'homework' | 'details'

/** An item inside the course dialog to scroll to and briefly highlight. */
export type CourseHighlight = { kind: 'homework'; id: string } | { kind: 'exam'; moed: 'A' | 'B' }

export interface OpenCourseRequest {
  courseId: string
  tab?: CourseTab
  highlight?: CourseHighlight
}

interface CourseDialogApi {
  openCourse: (request: OpenCourseRequest) => void
}

const CourseDialogContext = createContext<CourseDialogApi | null>(null)

/**
 * A single course dialog shared by every surface that opens a course
 * (course cards, calendar blocks/events, the exam roadmap, and the ticker
 * deep-links). Centralizing it removes the duplicated dialog state each of
 * those surfaces used to own and gives them a common `openCourse({ courseId,
 * tab, highlight })` entry point.
 */
export function CourseDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<OpenCourseRequest | null>(null)

  // Resolve the course reactively so in-dialog edits (and external sync updates)
  // stay reflected; a removed course closes the dialog.
  const course = useAppState((s) => {
    if (request === null) return null
    const semester = s.data.semesters.find((sem) => sem.id === s.currentSemesterId)
    return semester?.courses.find((c) => c.id === request.courseId) ?? null
  })

  const api = useMemo<CourseDialogApi>(() => ({ openCourse: setRequest }), [])

  return (
    <CourseDialogContext.Provider value={api}>
      {children}
      <CourseFormDialog
        open={request !== null && course !== null}
        course={course}
        initialTab={request?.tab}
        highlight={request?.highlight}
        onOpenChange={(open) => {
          if (!open) setRequest(null)
        }}
      />
    </CourseDialogContext.Provider>
  )
}

export function useCourseDialog(): CourseDialogApi {
  const api = useContext(CourseDialogContext)
  if (api === null) {
    throw new Error('useCourseDialog must be used inside a CourseDialogProvider')
  }
  return api
}
