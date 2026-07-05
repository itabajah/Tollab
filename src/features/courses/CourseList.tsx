import { useState } from 'react'
import { useAppActions, useAppState } from '@/hooks/session'
import { Button } from '@/components/ui/Button'
import { CourseCard } from './CourseCard'
import { CourseFormDialog } from './CourseFormDialog'
import { useCourseDialog } from './CourseDialogProvider'

export function CourseList() {
  const courses = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId)?.courses ?? [],
  )
  const { moveCourse } = useAppActions()
  const { openCourse } = useCourseDialog()
  // A local dialog for ADD only; editing an existing course goes through the
  // shared CourseDialogProvider so the ticker/calendar/roadmap all reuse it.
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div>
      {courses.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-inset text-ink-faint">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <p className="text-sm text-ink-muted">No courses yet in this semester.</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-ink-faint">
            Add your first course to start tracking lectures, homework, and exams.
          </p>
          <Button className="mt-4" variant="primary" onClick={() => setAddOpen(true)}>
            Add Course
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              isFirst={index === 0}
              isLast={index === courses.length - 1}
              onEdit={() => openCourse({ courseId: course.id })}
              onMove={(delta) => moveCourse(course.id, delta)}
            />
          ))}
          <Button
            variant="ghost"
            onClick={() => setAddOpen(true)}
            className="w-full border border-dashed border-line-strong py-3"
          >
            + Add Course
          </Button>
        </div>
      )}

      <CourseFormDialog open={addOpen} course={null} onOpenChange={setAddOpen} />
    </div>
  )
}
