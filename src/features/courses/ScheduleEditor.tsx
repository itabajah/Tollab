import { useState } from 'react'
import type { ScheduleSlot } from '@/domain/model'
import { Field, Input, Select } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

function formatSlot(slot: ScheduleSlot): string {
  return `${DAY_LABELS[slot.day]} ${slot.start}–${slot.end}`
}

export function ScheduleEditor({
  slots,
  onChange,
}: {
  slots: ScheduleSlot[]
  onChange: (slots: ScheduleSlot[]) => void
}) {
  const [day, setDay] = useState(0)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addSlot = () => {
    if (!HHMM.test(start) || !HHMM.test(end)) {
      setError('Enter valid times (HH:MM)')
      return
    }
    if (end <= start) {
      setError('End time must be after the start time')
      return
    }
    onChange([...slots, { day, start, end }])
    setStart('')
    setEnd('')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {slots.length === 0 ? (
          <p className="text-xs text-ink-faint">No class times yet.</p>
        ) : (
          slots.map((slot, index) => (
            <span
              key={`${slot.day}-${slot.start}-${index}`}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-inset py-1 pr-1 pl-2.5 text-xs text-ink"
            >
              {formatSlot(slot)}
              <button
                type="button"
                aria-label={`Remove ${formatSlot(slot)}`}
                className="inline-flex size-4 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-error-bg hover:text-error-border focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
                onClick={() => onChange(slots.filter((_, i) => i !== index))}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))
        )}
      </div>

      <div className="flex items-end gap-2">
        <Field label="Day">
          {(id) => (
            <Select id={id} value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAY_LABELS.map((label, value) => (
                <option key={label} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="From">
          {(id) => (
            <Input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          )}
        </Field>
        <Field label="To">
          {(id) => (
            <Input id={id} type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          )}
        </Field>
        <IconButton aria-label="Add slot" onClick={addSlot}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </IconButton>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-error-text">
          {error}
        </p>
      ) : null}
    </div>
  )
}
