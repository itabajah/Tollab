import { useId, useMemo, useState } from 'react'
import { useAppActions, useAppState } from '@/hooks/session'
import { sortSemesters, generateSemesterOptions } from '@/domain/semester'
import { VALIDATION_LIMITS } from '@/domain/model'
import { Select, Field, Input } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { PlusIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogActions } from '@/components/ui/Dialog'
import { useConfirm, usePrompt } from '@/components/ui/ConfirmProvider'
import { useToast } from '@/components/ui/Toast'

export function AddSemesterDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const semesters = useAppState((s) => s.data.semesters)
  const { addSemester } = useAppActions()
  const toast = useToast()
  const options = useMemo(() => generateSemesterOptions(new Date()), [])
  const [choice, setChoice] = useState(options[0] ?? 'custom')
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const create = () => {
    const name = (choice === 'custom' ? customName : choice).trim()
    if (name.length === 0) {
      setError('Semester name is required')
      return
    }
    if (name.length > VALIDATION_LIMITS.SEMESTER_NAME_MAX) {
      setError('Semester name is too long')
      return
    }
    if (semesters.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setError('A semester with this name already exists')
      return
    }
    addSemester(name)
    toast.success(`Created ${name}`)
    setError(null)
    setCustomName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Semester">
      <div className="flex flex-col gap-4">
        <Field label="Semester name" error={error}>
          {(id) => (
            <Select
              id={id}
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value)
                setError(null)
              }}
            >
              {options.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </Select>
          )}
        </Field>
        {choice === 'custom' ? (
          <Field label="Custom name">
            {(id) => (
              <Input
                id={id}
                value={customName}
                placeholder="e.g. Exchange Semester"
                onChange={(e) => {
                  setCustomName(e.target.value)
                  setError(null)
                }}
              />
            )}
          </Field>
        ) : null}
        <DialogActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={create}>
            Create Semester
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  )
}

export function SemesterControls() {
  const semesters = useAppState((s) => s.data.semesters)
  const currentSemesterId = useAppState((s) => s.currentSemesterId)
  const { selectSemester, renameSemester, deleteSemester } = useAppActions()
  const confirm = useConfirm()
  const prompt = usePrompt()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const selectId = useId()

  const sorted = sortSemesters(semesters)
  const current = semesters.find((s) => s.id === currentSemesterId)

  const onRename = async () => {
    if (!current) return
    const name = await prompt({
      title: 'Rename Semester',
      label: 'Semester name',
      initialValue: current.name,
      validate: (v) => (v.trim() ? null : 'Semester name is required'),
    })
    if (name === null) return
    renameSemester(current.id, name)
    toast.success('Semester renamed')
  }

  const onDelete = async () => {
    if (!current) return
    const ok = await confirm({
      title: 'Delete Semester?',
      message: `Delete "${current.name}"? All of its courses will be removed.`,
      confirmLabel: 'Delete',
      dangerous: true,
    })
    if (!ok) return
    deleteSemester(current.id)
    toast.success(`Deleted ${current.name}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">
        Semester
      </label>
      <Select
        id={selectId}
        className="flex-1"
        value={currentSemesterId ?? ''}
        onChange={(e) => selectSemester(e.target.value)}
        disabled={sorted.length === 0}
      >
        {sorted.length === 0 ? <option value="">No semesters yet</option> : null}
        {sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <IconButton aria-label="Add semester" onClick={() => setAddOpen(true)}>
        <PlusIcon />
      </IconButton>
      {current ? (
        <IconButton aria-label="Rename semester" onClick={() => void onRename()}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </IconButton>
      ) : null}
      {current ? (
        <IconButton aria-label="Delete semester" danger onClick={() => void onDelete()}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </IconButton>
      ) : null}
      <AddSemesterDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
