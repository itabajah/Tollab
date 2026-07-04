import { useState } from 'react'
import { useAppState } from '@/hooks/session'
import { AppShell } from '@/features/layout/AppShell'
import { Header } from '@/features/layout/Header'
import { SemesterControls, AddSemesterDialog } from '@/features/semesters/SemesterControls'
import { CourseList } from '@/features/courses/CourseList'
import { WeekCalendar } from '@/features/calendar/WeekCalendar'
import { useNow } from '@/hooks/useNow'
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

function LeftPane() {
  const hasSemester = useAppState((s) => s.currentSemesterId !== null)
  return (
    <>
      <Header />
      <SemesterControls />
      {hasSemester ? <CourseList /> : <NoSemesterYet />}
    </>
  )
}

function RightPane() {
  const hasSemester = useAppState((s) => s.currentSemesterId !== null)
  const now = useNow()
  if (!hasSemester) return null
  return <WeekCalendar now={now} />
}

export default function App() {
  return <AppShell left={<LeftPane />} right={<RightPane />} />
}
