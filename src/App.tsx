import { useState } from 'react'
import type { Semester } from '@/domain/model'
import { resolveExamViewMode } from '@/domain/examMode'
import { useAppState } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { AppShell } from '@/features/layout/AppShell'
import { Header } from '@/features/layout/Header'
import { HeaderTicker } from '@/features/ticker/HeaderTicker'
import { SemesterControls, AddSemesterDialog } from '@/features/semesters/SemesterControls'
import { CourseList } from '@/features/courses/CourseList'
import { WeekCalendar } from '@/features/calendar/WeekCalendar'
import { HomeworkList } from '@/features/homework/HomeworkList'
import { ExamRoadmap } from '@/features/exam-mode/ExamRoadmap'
import { ViewToggle } from '@/features/exam-mode/ViewToggle'
import { Button } from '@/components/ui/Button'

function NoSemesterYet() {
  const [addOpen, setAddOpen] = useState(false)
  return (
    <div className="mt-10 rounded-xs border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="text-sm text-ink-muted">No semester yet — create one to get started.</p>
      <Button className="mt-4" variant="primary" onClick={() => setAddOpen(true)}>
        Create your first semester
      </Button>
      <AddSemesterDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function LeftPane({ now }: { now: Date }) {
  const hasSemester = useAppState((s) => s.currentSemesterId !== null)
  return (
    <>
      <Header />
      <HeaderTicker now={now} />
      <SemesterControls />
      {hasSemester ? <CourseList /> : <NoSemesterYet />}
    </>
  )
}

function RightPane({ now }: { now: Date }) {
  const semester = useAppState((s) =>
    s.data.semesters.find((sem) => sem.id === s.currentSemesterId),
  ) as Semester | undefined

  if (!semester) return null

  const view = resolveExamViewMode(semester, now)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ViewToggle now={now} />
      </div>
      {view === 'exam' ? (
        <ExamRoadmap now={now} />
      ) : (
        <>
          <WeekCalendar now={now} />
          <section>
            <h3 className="mb-2 text-[13px] font-semibold tracking-[0.5px] text-ink-faint uppercase">
              Homework
            </h3>
            <HomeworkList today={now} />
          </section>
        </>
      )}
    </div>
  )
}

export default function App() {
  const now = useNow()
  return <AppShell left={<LeftPane now={now} />} right={<RightPane now={now} />} />
}
