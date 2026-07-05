import { useAppState } from '@/hooks/session'
import { HomeworkItem } from './HomeworkItem'

interface SidebarEntry {
  homeworkId: string
  courseId: string
  courseName: string
  courseColor: string
  dueDate: string
}

/**
 * The right-pane homework sidebar: every incomplete assignment across all
 * courses in the current semester, sorted by due date (undated last).
 */
export function HomeworkList({ today = new Date() }: { today?: Date }) {
  const courses = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId)?.courses ?? [],
  )

  const entries: SidebarEntry[] = courses.flatMap((course) =>
    course.homework
      .filter((hw) => !hw.completed)
      .map((hw) => ({
        homeworkId: hw.id,
        courseId: course.id,
        courseName: course.name,
        courseColor: course.color,
        dueDate: hw.dueDate,
      })),
  )

  // date_asc across courses: undated sink to the bottom, otherwise ascending.
  const sorted = [...entries].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0
  })

  if (sorted.length === 0) {
    return (
      <p className="rounded-xs border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
        You&apos;re all caught up.
      </p>
    )
  }

  const homeworkById = (courseId: string, homeworkId: string) =>
    courses.find((c) => c.id === courseId)?.homework.find((h) => h.id === homeworkId)

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((entry) => {
        const homework = homeworkById(entry.courseId, entry.homeworkId)
        if (!homework) return null
        return (
          <li key={`${entry.courseId}:${entry.homeworkId}`}>
            <HomeworkItem
              variant="sidebar"
              courseId={entry.courseId}
              homework={homework}
              today={today}
              courseName={entry.courseName}
              courseColor={entry.courseColor}
            />
          </li>
        )
      })}
    </ul>
  )
}
