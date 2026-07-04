import { useState } from 'react'
import type { Course } from '@/domain/model'
import { useAppActions, useAppState } from '@/hooks/session'
import { Button } from '@/components/ui/Button'
import { CourseCard } from './CourseCard'
import { CourseFormDialog } from './CourseFormDialog'

export function CourseList() {
  const courses = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId)?.courses ?? [],
  )
  const { moveCourse } = useAppActions()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (course: Course) => {
    setEditing(course)
    setDialogOpen(true)
  }

  return (
    <div className="mt-6">
      {courses.length === 0 ? (
        <div className="rounded-xs border border-dashed border-line-strong px-6 py-10 text-center">
          <p className="text-sm text-ink-muted">No courses yet in this semester.</p>
          <Button className="mt-3" variant="primary" onClick={openAdd}>
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
              onEdit={() => openEdit(course)}
              onMove={(delta) => moveCourse(course.id, delta)}
            />
          ))}
          <Button
            variant="ghost"
            onClick={openAdd}
            className="w-full border border-dashed border-line-strong py-3"
          >
            + Add Course
          </Button>
        </div>
      )}

      <CourseFormDialog
        open={dialogOpen}
        course={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
      />
    </div>
  )
}
