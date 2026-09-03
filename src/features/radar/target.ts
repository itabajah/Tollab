import type { RadarTarget } from '@/domain/radar'
import type { OpenCourseRequest } from '@/features/courses/CourseDialogProvider'

/**
 * Maps a radar signal's target to a course-dialog open request (or null when
 * there is no course to open): homework/exam signals deep-link to the specific
 * item, recordings/class signals just open the relevant tab. Pure so it can be
 * unit tested without rendering the app.
 */
export function radarTargetToRequest(target: RadarTarget): OpenCourseRequest | null {
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
