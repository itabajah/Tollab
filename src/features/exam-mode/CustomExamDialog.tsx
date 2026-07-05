import { useEffect, useState } from 'react'
import type { CustomExam } from '@/domain/model'
import { validateCustomExam, type CustomExamErrors } from '@/domain/examMode'
import { hueFromColor } from '@/domain/colors'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { Dialog, DialogActions } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useExamActions } from './useExamActions'

const DEFAULT_HUE = 210

export function CustomExamDialog({
  open,
  onOpenChange,
  semesterId,
  exam,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterId: string
  exam?: CustomExam | null
}) {
  const { addCustomExam, updateCustomExam, removeCustomExam } = useExamActions()
  const toast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [hue, setHue] = useState(DEFAULT_HUE)
  const [errors, setErrors] = useState<CustomExamErrors>({})

  // Seed the form whenever the dialog opens (for a new or existing exam).
  useEffect(() => {
    if (!open) return
    setName(exam?.name ?? '')
    setLabel(exam?.label ?? '')
    setDate(exam?.date ?? '')
    setHue(exam?.color ? hueFromColor(exam.color) : DEFAULT_HUE)
    setErrors({})
  }, [open, exam])

  const save = () => {
    const result = validateCustomExam({ name, label, date })
    if (!result.valid) {
      setErrors(result.errors)
      return
    }
    if (exam) {
      updateCustomExam(semesterId, exam.id, { name, label, date, hue })
      toast.success('Exam updated')
    } else {
      addCustomExam(semesterId, { name, label, date, hue })
      toast.success('Exam added')
    }
    onOpenChange(false)
  }

  const onDelete = async () => {
    if (!exam) return
    const ok = await confirm({
      title: 'Delete Exam',
      message: `Delete "${exam.name}"?`,
      confirmLabel: 'Delete',
      dangerous: true,
    })
    if (!ok) return
    removeCustomExam(semesterId, exam.id)
    toast.success('Exam deleted')
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={exam ? 'Edit Custom Exam' : 'Add Custom Exam'}
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" error={errors.name ?? null}>
          {(id) => (
            <Input id={id} value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          )}
        </Field>
        <Field label="Label" hint="Optional (e.g. Quiz, Midterm)" error={errors.label ?? null}>
          {(id) => <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} />}
        </Field>
        <Field label="Date" error={errors.date ?? null}>
          {(id) => (
            <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>
        <Field label="Color">
          {(id) => (
            <div className="flex items-center gap-3">
              <input
                id={id}
                type="range"
                min={0}
                max={360}
                value={hue}
                onChange={(e) => setHue(Number(e.target.value))}
                className="hue-slider flex-1"
              />
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded-xs border border-line"
                style={{ backgroundColor: `hsl(${hue}, 45%, 50%)` }}
              />
            </div>
          )}
        </Field>

        <DialogActions>
          {exam ? (
            <Button variant="danger" className="mr-auto" onClick={() => void onDelete()}>
              Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  )
}
