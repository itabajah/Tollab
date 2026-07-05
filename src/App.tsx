import { useState } from 'react'
import { resolveExamViewMode } from '@/domain/examMode'
import type { TickerTarget } from '@/domain/ticker'
import { useAppState } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { AppShell } from '@/features/layout/AppShell'
import { Header } from '@/features/layout/Header'
import { HeaderTicker } from '@/features/ticker/HeaderTicker'
import { SemesterControls, AddSemesterDialog } from '@/features/semesters/SemesterControls'
import { CourseList } from '@/features/courses/CourseList'
import { useCourseDialog } from '@/features/courses/CourseDialogProvider'
import { tickerTargetToRequest } from '@/features/courses/tickerTarget'
import { WeekCalendar } from '@/features/calendar/WeekCalendar'
import { HomeworkList } from '@/features/homework/HomeworkList'
import { ExamRoadmap } from '@/features/exam-mode/ExamRoadmap'
import { ViewToggle } from '@/features/exam-mode/ViewToggle'
import { Button } from '@/components/ui/Button'

function NoSemesterYet() {
  const [addOpen, setAddOpen] = useState(false)
  return (
    <div className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-inset text-ink-faint">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-ink">No semester yet</h2>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-muted">
        Create a semester to track your courses, weekly schedule, homework, and exams.
      </p>
      <Button className="mt-5" variant="primary" onClick={() => setAddOpen(true)}>
        Create your first semester
      </Button>
      <AddSemesterDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

// LeftPane does not read the clock, so it does not re-render on the minute tick;
// only its HeaderTicker child (a `useNow` consumer) does.
function LeftPane() {
  const hasSemester = useAppState((s) => s.currentSemesterId !== null)
  const { openCourse } = useCourseDialog()

  const onSelect = (target: TickerTarget) => {
    const request = tickerTargetToRequest(target)
    if (request) openCourse(request)
  }

  return (
    <div className="flex flex-col gap-6">
      <Header />
      <HeaderTicker onSelect={onSelect} />
      <SemesterControls />
      {hasSemester ? <CourseList /> : <NoSemesterYet />}
    </div>
  )
}

function RightPane() {
  const now = useNow()
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  )

  if (!semester) return null

  const view = resolveExamViewMode(semester, now)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ViewToggle />
      </div>
      {view === 'exam' ? (
        <ExamRoadmap />
      ) : (
        <>
          <WeekCalendar />
          <section id="homework-list">
            <h3 className="mb-2 text-[13px] font-semibold tracking-[0.5px] text-ink-faint uppercase">
              Homework
            </h3>
            <HomeworkList />
          </section>
          <ScrollToHomeworkButton />
        </>
      )}
    </div>
  )
}

/**
 * A floating shortcut (mobile only, where the panes stack into one long column)
 * that jumps to the homework list — otherwise it can sit far below the calendar.
 */
function ScrollToHomeworkButton() {
  const isMobile = useMediaQuery('(max-width: 1023px)')
  if (!isMobile) return null
  return (
    <button
      type="button"
      aria-label="Scroll to homework"
      onClick={() =>
        document.getElementById('homework-list')?.scrollIntoView({ behavior: 'smooth' })
      }
      className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-4 py-2 text-xs font-medium text-ink shadow-md transition-[box-shadow,transform] duration-150 hover:shadow-lg active:scale-95"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
      Homework
    </button>
  )
}

export default function App() {
  return <AppShell left={<LeftPane />} right={<RightPane />} />
}
