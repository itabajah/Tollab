import { useMemo, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import type { Course, ScheduleSlot } from '@/domain/model'
import { VALIDATION_LIMITS } from '@/domain/model'
import { createCourse, courseDetailFields, type CourseInput } from '@/domain/course'
import { hueFromColor, nextCourseColor } from '@/domain/colors'
import { useAppActions, useAppState } from '@/hooks/session'
import { useHighlight } from '@/hooks/useHighlight'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Dialog, DialogActions } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, TextArea } from '@/components/ui/Field'
import { ScheduleEditor } from './ScheduleEditor'
import type { CourseTab, CourseHighlight } from './CourseDialogProvider'
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

type FieldKey = 'name' | 'points' | 'grade' | 'syllabus'
type FieldErrors = Partial<Record<FieldKey, string>>

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

const isNumeric = (v: string) => /^\d+(\.\d+)?$/.test(v)
const isLikelyUrl = (v: string) => /^https?:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+/.test(v)

/** Lightweight per-field validation. Empty optional fields are always valid. */
function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  const name = form.name.trim()
  if (name.length === 0) errors.name = 'Course name is required'
  else if (name.length > VALIDATION_LIMITS.COURSE_NAME_MAX) errors.name = 'Course name is too long'

  const grade = form.grade.trim()
  if (grade && !(isNumeric(grade) && Number(grade) >= 0 && Number(grade) <= 100)) {
    errors.grade = 'Enter a grade from 0 to 100'
  }

  const points = form.points.trim()
  if (points && !isNumeric(points)) errors.points = 'Points must be a number'

  const syllabus = form.syllabus.trim()
  if (syllabus && !isLikelyUrl(syllabus)) errors.syllabus = 'Enter a valid URL (https://…)'

  return errors
}

const courseTabTrigger =
  '-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus data-[state=active]:border-accent data-[state=active]:text-ink'

export function CourseFormDialog({
  open,
  course,
  onOpenChange,
  initialTab,
  highlight,
}: {
  open: boolean
  course: Course | null
  onOpenChange: (open: boolean) => void
  initialTab?: CourseTab | undefined
  highlight?: CourseHighlight | undefined
}) {
  const settings = useAppState((s) => s.data.settings)
  const courses = useAppState(
    (s) => s.data.semesters.find((sem) => sem.id === s.currentSemesterId)?.courses,
  )
  const { addCourse, updateCourseDetails, removeCourse } = useAppActions()
  const toast = useToast()
  const confirm = useConfirm()

  const defaultHue = useMemo(
    () =>
      hueFromColor(
        nextCourseColor(
          (courses ?? []).map((c) => c.color),
          settings,
        ),
      ),
    [courses, settings],
  )
  const [form, setForm] = useState<FormState>(() => initialState(course, defaultHue))
  const [seededFor, setSeededFor] = useState<string>(course?.id ?? '__new__')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [seededOpen, setSeededOpen] = useState(false)
  const [tab, setTab] = useState<CourseTab>(initialTab ?? 'recordings')

  // Re-seed the form (and the active tab, for deep-links) each time the dialog
  // OPENS — the component stays mounted while `open` toggles, so otherwise
  // reopening the same course would resurface edits the user had cancelled.
  const target = course?.id ?? '__new__'
  if (open && (!seededOpen || seededFor !== target)) {
    setForm(initialState(course, defaultHue))
    setSeededFor(target)
    setErrors({})
    setSeededOpen(true)
    setTab(initialTab ?? 'recordings')
  } else if (!open && seededOpen) {
    setSeededOpen(false)
  }

  // Deep-link highlight of an exam field (details tab). Homework highlighting is
  // threaded down to the matching row inside HomeworkTab.
  const moedARef = useRef<HTMLDivElement>(null)
  const moedBRef = useRef<HTMLDivElement>(null)
  const examHighlight =
    open && tab === 'details' && highlight?.kind === 'exam' ? highlight.moed : null
  useHighlight(moedARef, examHighlight === 'A')
  useHighlight(moedBRef, examHighlight === 'B')
  const highlightHomeworkId = highlight?.kind === 'homework' ? highlight.id : undefined

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const clearError = (key: FieldKey) =>
    setErrors((e) => {
      if (!(key in e)) return e
      const next = { ...e }
      delete next[key]
      return next
    })

  const save = () => {
    const found = validate(form)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      // A field error may live on the Details tab; make sure it's visible.
      if (course) setTab('details')
      return
    }
    const input: CourseInput = {
      name: form.name.trim(),
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
      toast.success(`Course "${input.name}" created`)
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
      <Field label="Course name" error={errors.name}>
        {(id) => (
          <Input
            id={id}
            value={form.name}
            autoFocus={!course}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => {
              patch('name', e.target.value)
              clearError('name')
            }}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Course number">
          {(id) => (
            <Input id={id} value={form.number} onChange={(e) => patch('number', e.target.value)} />
          )}
        </Field>
        <Field label="Points" error={errors.points}>
          {(id) => (
            <Input
              id={id}
              value={form.points}
              inputMode="decimal"
              aria-invalid={errors.points ? true : undefined}
              onChange={(e) => {
                patch('points', e.target.value)
                clearError('points')
              }}
            />
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
            <Input
              id={id}
              value={form.faculty}
              onChange={(e) => patch('faculty', e.target.value)}
            />
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
        <Field label="Final grade" hint="0–100, optional" error={errors.grade}>
          {(id) => (
            <Input
              id={id}
              value={form.grade}
              inputMode="numeric"
              aria-invalid={errors.grade ? true : undefined}
              onChange={(e) => {
                patch('grade', e.target.value)
                clearError('grade')
              }}
            />
          )}
        </Field>
      </div>

      <Field label="Syllabus URL" error={errors.syllabus}>
        {(id) => (
          <Input
            id={id}
            value={form.syllabus}
            inputMode="url"
            aria-invalid={errors.syllabus ? true : undefined}
            onChange={(e) => {
              patch('syllabus', e.target.value)
              clearError('syllabus')
            }}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div ref={moedARef} className="rounded-control">
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
        </div>
        <div ref={moedBRef} className="rounded-control">
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
      </div>

      <Field label="Notes">
        {(id) => (
          <TextArea id={id} value={form.notes} onChange={(e) => patch('notes', e.target.value)} />
        )}
      </Field>

      <div>
        <p className="label-caps mb-2 text-ink-muted">Weekly schedule</p>
        <ScheduleEditor
          slots={form.schedule}
          onChange={(schedule) => patch('schedule', schedule)}
        />
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
                className="h-6 w-6 shrink-0 rounded-control border border-line"
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
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={course ? 'Edit Course' : 'Add Course'}
      wide
    >
      {course ? (
        <Tabs.Root value={tab} onValueChange={(v) => setTab(v as CourseTab)}>
          <Tabs.List className="mb-4 flex gap-1 border-b border-line" aria-label="Course sections">
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
            <HomeworkTab courseId={course.id} highlightId={highlightHomeworkId} />
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
