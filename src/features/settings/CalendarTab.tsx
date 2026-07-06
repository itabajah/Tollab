import { useState } from 'react'
import type { CalendarSettings } from '@/domain/model'
import { useAppActions, useAppState } from '@/hooks/session'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Touched = { start: boolean; end: boolean; days: boolean }

export function CalendarTab() {
  const semester = useAppState((s) => s.data.semesters.find((x) => x.id === s.currentSemesterId))
  const { updateCalendarSettings } = useAppActions()
  const toast = useToast()
  const [startHour, setStartHour] = useState(String(semester?.calendarSettings.startHour ?? 8))
  const [endHour, setEndHour] = useState(String(semester?.calendarSettings.endHour ?? 20))
  const [days, setDays] = useState<number[]>(
    semester?.calendarSettings.visibleDays ?? [0, 1, 2, 3, 4, 5],
  )
  // Track which fields the user actually edited since mount, so Save writes only
  // those — a field left untouched keeps its live value and isn't clobbered by
  // this form's mount-time snapshot if a cloud sync changed it meanwhile.
  const [touched, setTouched] = useState<Touched>({ start: false, end: false, days: false })
  const [error, setError] = useState<string | null>(null)

  if (!semester) {
    return (
      <p className="text-sm text-ink-muted">Create a semester first to configure its calendar.</p>
    )
  }

  const toggleDay = (day: number) => {
    setTouched((t) => ({ ...t, days: true }))
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    )
  }

  const save = () => {
    const start = Number(startHour)
    const end = Number(endHour)
    if (!Number.isInteger(start) || start < 0 || start > 23) {
      setError('Start hour must be between 0 and 23')
      return
    }
    if (!Number.isInteger(end) || end < 1 || end > 24) {
      setError('End hour must be between 1 and 24')
      return
    }
    if (end <= start) {
      setError('End hour must be after the start hour')
      return
    }
    if (days.length === 0) {
      setError('Select at least one day')
      return
    }
    const patch: Partial<CalendarSettings> = {}
    if (touched.start) patch.startHour = start
    if (touched.end) patch.endHour = end
    if (touched.days) patch.visibleDays = days
    if (Object.keys(patch).length > 0) updateCalendarSettings(semester.id, patch)
    setTouched({ start: false, end: false, days: false })
    setError(null)
    toast.success('Calendar settings saved')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start hour">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => {
                setTouched((t) => ({ ...t, start: true }))
                setStartHour(e.target.value)
              }}
            />
          )}
        </Field>
        <Field label="End hour">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1}
              max={24}
              value={endHour}
              onChange={(e) => {
                setTouched((t) => ({ ...t, end: true }))
                setEndHour(e.target.value)
              }}
            />
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] tracking-[0.5px] text-ink-muted uppercase">
          Visible days
        </legend>
        <div className="flex flex-wrap gap-3">
          {DAY_LABELS.map((label, day) => (
            <label
              key={label}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-ink"
            >
              <input
                type="checkbox"
                checked={days.includes(day)}
                onChange={() => toggleDay(day)}
                className="accent-(--accent)"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? <p className={cn('text-xs text-error-border')}>{error}</p> : null}
      <div>
        <Button variant="primary" onClick={save} aria-label="Save calendar settings">
          Save
        </Button>
      </div>
    </div>
  )
}
