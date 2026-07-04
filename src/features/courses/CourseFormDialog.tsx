import { useMemo, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import type { Course, ScheduleSlot } from '@/domain/model'
import { VALIDATION_LIMITS } from '@/domain/model'
import { createCourse, courseDetailFields, type CourseInput } from '@/domain/course'
import { hueFromColor, nextCourseColor } from '@/domain/colors'
import { useAppActions, useAppState } from '@/hooks/session'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Dialog, DialogActions } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, TextArea } from '@/components/ui/Field'
import { ScheduleEditor } from './ScheduleEditor'
import { HomeworkTab } from '@/features/homework/HomeworkTab'
import { RecordingsTab } from '@/features/recordings/RecordingsTab'

interface FormState {
  name: string
  number: string
  points: string
  lecturer: string
  faculty: string
  location: string
  grade: string
  syllabus: string
  notes: string
  moedA: string
  moedB: string
  hue: number
  schedule: ScheduleSlot[]
}

function initialState(course: Course | null, defaultHue: number): FormState {
  if (!course) {
    return {
      name: '',
      number: '',
      points: '',
      lecturer: '',
      faculty: '',
      location: '',
      grade: '',
      syllabus: '',
      notes: '',
      moedA: '',
      moedB: '',
      hue: defaultHue,
      schedule: [],
    }
  }
  return {
    name: course.name,
    number: course.number,
    points: course.points,
    lecturer: course.lecturer,
    faculty: course.faculty,
    location: course.location,
    grade: course.grade,
    syllabus: course.syllabus,
    notes: course.notes,
    moedA: course.exams.moedA,
    moedB: course.exams.moedB,
    hue: hueFromColor(course.color),
    schedule: course.schedule,
  }
}

const courseTabTrigger =
  'rounded-xs border border-transparent px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink data-[state=active]:border-line data-[state=active]:bg-inset data-[state=active]:text-ink'

export function CourseFormDialog({
  open,
  course,
  onOpenChange,
}: {
  open: boolean
  course: Course | null
  onOpenChange: (open: boolean) => void
}) {
  const settings = useAppState((s) => s.data.settings)
  const courseCount = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId)?.courses.length ?? 0,
  )
  const { addCourse, updateCourseDetails, removeCourse } = useAppActions()
  const toast = useToast()
  const confirm = useConfirm()

  const defaultHue = useMemo(
    () => hueFromColor(nextCourseColor(courseCount, settings)),
    [courseCount, settings],
  )
  const [form, setForm] = useState<FormState>(() => initialState(course, defaultHue))
  const [seededFor, setSeededFor] = useState<string>(course?.id ?? '__new__')
  const [error, setError] = useState<string | null>(null)

  // Re-seed the form each time the dialog opens for a (different) course.
  if (open && seededFor !== (course?.id ?? '__new__')) {
    setForm(initialState(course, defaultHue))
    setSeededFor(course?.id ?? '__new__')
    setError(null)
  }

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const save = () => {
    const name = form.name.trim()
    if (name.length === 0) {
      setError('Course name is required')
      return
    }
    if (name.length > VALIDATION_LIMITS.COURSE_NAME_MAX) {
      setError('Course name is too long')
      return
    }
    const input: CourseInput = {
      name,
      number: form.number.trim(),
      points: form.points.trim(),
      lecturer: form.lecturer.trim(),
      faculty: form.faculty.trim(),
      location: form.location.trim(),
      grade: form.grade.trim(),
      syllabus: form.syllabus.trim(),
      notes: form.notes,
      hue: form.hue,
      exams: { moedA: form.moedA, moedB: form.moedB },
      schedule: form.schedule,
    }
    if (course) {
      updateCourseDetails(course.id, courseDetailFields(input, settings.colorTheme))
      toast.success('Course updated')
    } else {
      addCourse(createCourse(input, settings.colorTheme))
      toast.success(`Course "${name}" created`)
    }
    onOpenChange(false)
  }

  const onDelete = async () => {
    if (!course) return
    const ok = await confirm({
      title: 'Delete Course',
      message: `Delete "${course.name}"?`,
      description:
        'This permanently deletes the course and all its recordings, homework, and schedule.',
      confirmLabel: 'Delete',
      dangerous: true,
    })
    if (!ok) return
    removeCourse(course.id)
    toast.success(`Course "${course.name}" deleted`)
    onOpenChange(false)
  }

  const detailsBody = (
    <div className="flex flex-col gap-4">
      <Field label="Course name" error={error}>
        {(id) => (
          <Input
            id={id}
            value={form.name}
            autoFocus
            onChange={(e) => {
              patch('name', e.target.value)
              setError(null)
            }}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Course number">
          {(id) => (
            <Input id={id} value={form.number} onChange={(e) => patch('number', e.target.value)} />
          )}
        </Field>
        <Field label="Points">
          {(id) => (
            <Input id={id} value={form.points} onChange={(e) => patch('points', e.target.value)} />
          )}
        </Field>
        <Field label="Lecturer">
          {(id) => (
            <Input
              id={id}
              value={form.lecturer}
              onChange={(e) => patch('lecturer', e.target.value)}
            />
          )}
        </Field>
        <Field label="Faculty">
          {(id) => (
            <Input id={id} value={form.faculty} onChange={(e) => patch('faculty', e.target.value)} />
          )}
        </Field>
        <Field label="Location">
          {(id) => (
            <Input
              id={id}
              value={form.location}
              onChange={(e) => patch('location', e.target.value)}
            />
          )}
        </Field>
        <Field label="Final grade" hint="0–100, optional">
          {(id) => (
            <Input id={id} value={form.grade} onChange={(e) => patch('grade', e.target.value)} />
          )}
        </Field>
      </div>

      <Field label="Syllabus URL">
        {(id) => (
          <Input id={id} value={form.syllabus} onChange={(e) => patch('syllabus', e.target.value)} />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Exam date — Moed A">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={form.moedA}
              onChange={(e) => patch('moedA', e.target.value)}
            />
          )}
        </Field>
        <Field label="Exam date — Moed B">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={form.moedB}
              onChange={(e) => patch('moedB', e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Notes">
        {(id) => (
          <TextArea id={id} value={form.notes} onChange={(e) => patch('notes', e.target.value)} />
        )}
      </Field>

      <div>
        <p className="mb-2 text-[13px] tracking-[0.5px] text-ink-muted uppercase">Weekly schedule</p>
        <ScheduleEditor slots={form.schedule} onChange={(schedule) => patch('schedule', schedule)} />
      </div>

      {settings.colorTheme !== 'mono' ? (
        <Field label="Course color">
          {(id) => (
            <div className="flex items-center gap-3">
              <input
                id={id}
                type="range"
                min={0}
                max={360}
                value={form.hue}
                onChange={(e) => patch('hue', Number(e.target.value))}
                className="hue-slider flex-1"
              />
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded-xs border border-line"
                style={{ backgroundColor: `hsl(${form.hue}, 45%, 50%)` }}
              />
            </div>
          )}
        </Field>
      ) : null}
    </div>
  )

  const footer = (
    <DialogActions>
      {course ? (
        <Button variant="danger" className="mr-auto" onClick={() => void onDelete()}>
          Delete Course
        </Button>
      ) : null}
      <Button variant="ghost" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={save}>
        Save Course
      </Button>
    </DialogActions>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={course ? 'Edit Course' : 'Add Course'} wide>
      {course ? (
        <Tabs.Root defaultValue="recordings">
          <Tabs.List
            className="mb-4 flex gap-1 border-b border-line pb-2"
            aria-label="Course sections"
          >
            <Tabs.Trigger value="recordings" className={courseTabTrigger}>
              Recordings
            </Tabs.Trigger>
            <Tabs.Trigger value="homework" className={courseTabTrigger}>
              Homework
            </Tabs.Trigger>
            <Tabs.Trigger value="details" className={courseTabTrigger}>
              Details
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="recordings">
            <RecordingsTab courseId={course.id} />
          </Tabs.Content>
          <Tabs.Content value="homework">
            <HomeworkTab courseId={course.id} />
          </Tabs.Content>
          <Tabs.Content value="details">
            {detailsBody}
            {footer}
          </Tabs.Content>
        </Tabs.Root>
      ) : (
        <>
          {detailsBody}
          {footer}
        </>
      )}
    </Dialog>
  )
}
