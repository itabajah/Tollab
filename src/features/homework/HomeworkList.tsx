import { useMemo } from 'react'
import type { Course, Homework } from '@/domain/model'
import { sortHomework } from '@/domain/homework'
import { useAppActions, useAppState } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { Checkbox } from '@/components/ui/Checkbox'
import { HomeworkItem } from './HomeworkItem'

interface CourseMeta {
  courseId: string
  courseName: string
  courseColor: string
}

/**
 * The right-pane homework sidebar: every assignment across all courses in the
 * current semester, ordered by the shared domain sort (`date_asc` — undated
 * sink to the bottom). The global "Show done" preference (`settings.showCompleted`)
 * controls whether completed items appear; ordering is delegated to
 * `sortHomework` so the sidebar and the per-course list stay consistent.
 */
export function HomeworkList({ today: todayProp }: { today?: Date }) {
  const today = useNow(todayProp)
  const courses = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId)?.courses ?? [],
  )
  const showCompleted = useAppState((s) => s.data.settings.showCompleted)
  const { updateSettings } = useAppActions()

  const { sorted, metaByRef } = useMemo(
    () => buildSidebar(courses, showCompleted),
    [courses, showCompleted],
  )

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-1.5 self-end text-xs text-ink-muted">
        <Checkbox
          aria-label="Show done"
          checked={showCompleted}
          onCheckedChange={(c) => updateSettings({ showCompleted: c })}
        />
        Show done
      </label>

      {sorted.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          You&apos;re all caught up.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((homework) => {
            const meta = metaByRef.get(homework)
            if (!meta) return null
            return (
              <li key={`${meta.courseId}:${homework.id}`}>
                <HomeworkItem
                  variant="sidebar"
                  courseId={meta.courseId}
                  homework={homework}
                  today={today}
                  courseName={meta.courseName}
                  courseColor={meta.courseColor}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function buildSidebar(
  courses: readonly Course[],
  showCompleted: boolean,
): {
  sorted: Homework[]
  metaByRef: Map<Homework, CourseMeta>
} {
  const items: Homework[] = []
  // Keyed by the homework OBJECT (never its id) so two courses that happen to
  // hold assignments with the same id — possible after a duplicate import —
  // can never alias each other's course name / color / toggle target.
  const metaByRef = new Map<Homework, CourseMeta>()
  for (const course of courses) {
    for (const hw of course.homework) {
      if (hw.completed && !showCompleted) continue
      items.push(hw)
      metaByRef.set(hw, {
        courseId: course.id,
        courseName: course.name,
        courseColor: course.color,
      })
    }
  }
  return { sorted: sortHomework(items, 'date_asc'), metaByRef }
}
