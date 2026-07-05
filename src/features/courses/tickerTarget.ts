import type { TickerTarget } from '@/domain/ticker'
import type { OpenCourseRequest } from './CourseDialogProvider'

/**
 * Maps a clicked ticker item to a course-dialog open request (or null when it
 * has no course to open): homework/exam items deep-link to the specific item,
 * recordings/class items just open the relevant tab. Pure so it can be unit
 * tested without rendering the app.
 */
export function tickerTargetToRequest(target: TickerTarget): OpenCourseRequest | null {
  if (!target.courseId) return null
  switch (target.type) {
    case 'homework':
      return target.homeworkId
        ? {
            courseId: target.courseId,
            tab: 'homework',
            highlight: { kind: 'homework', id: target.homeworkId },
          }
        : { courseId: target.courseId, tab: 'homework' }
    case 'recordings':
      return { courseId: target.courseId, tab: 'recordings' }
    case 'exam':
      return {
        courseId: target.courseId,
        tab: 'details',
        ...(target.moed ? { highlight: { kind: 'exam' as const, moed: target.moed } } : {}),
      }
    case 'course':
      return { courseId: target.courseId, tab: 'details' }
    default:
      return null
  }
}
