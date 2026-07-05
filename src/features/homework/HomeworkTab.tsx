import { useState } from 'react'
import { sortHomework } from '@/domain/homework'
import { useAppActions, useAppState } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Field'
import { SortMenu } from './SortMenu'
import { HomeworkItem } from './HomeworkItem'

/**
 * The Homework tab of the course dialog: an add row, sort + show-done controls,
 * and the sorted (optionally completed-filtered) list of assignments.
 */
export function HomeworkTab({
  courseId,
  today: todayProp,
  highlightId,
}: {
  courseId: string
  today?: Date
  /** A homework id to scroll to and briefly highlight (deep-link). */
  highlightId?: string | undefined
}) {
  // Share the app's ticking clock so due/overdue labels refresh at day
  // boundaries (and match the sidebar); tests can still pin `today`.
  const today = useNow(todayProp)
  const course = useAppState((s) =>
    s.data.semesters
      .find((sem) => sem.id === s.currentSemesterId)
      ?.courses.find((c) => c.id === courseId),
  )
  const { addHomework, setHomeworkSort, setShowCompletedHomework } = useAppActions()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  if (!course) return null

  const sorted = sortHomework(course.homework, course.homeworkSort)
  const visible = course.showCompletedHomework ? sorted : sorted.filter((h) => !h.completed)
  const canAdd = title.trim().length > 0
  const isManual = course.homeworkSort === 'manual'

  const add = () => {
    if (!canAdd) return
    addHomework(courseId, title, dueDate)
    setTitle('')
    setDueDate('')
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <Input
          aria-label="Assignment"
          placeholder="New assignment…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          aria-label="Due date for new assignment"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="!w-auto"
        />
        <Button type="submit" variant="primary" aria-label="Add assignment" disabled={!canAdd}>
          Add
        </Button>
      </form>

      <div className="flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink-muted">
          <Checkbox
            aria-label="Show done"
            checked={course.showCompletedHomework}
            onCheckedChange={(c) => setShowCompletedHomework(courseId, c)}
          />
          Show done
        </label>
        <SortMenu
          value={course.homeworkSort}
          onChange={(sort) => setHomeworkSort(courseId, sort)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          No assignments yet. Add one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((hw, index) => (
            <li key={hw.id}>
              <HomeworkItem
                courseId={courseId}
                homework={hw}
                today={today}
                showReorder={isManual}
                isFirst={index === 0}
                isLast={index === visible.length - 1}
                highlight={hw.id === highlightId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
