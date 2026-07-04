import { useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { useAppActions, useAppState, useProfilesState, useSession } from '@/hooks/session'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select } from '@/components/ui/Field'
import { useConfirm, usePrompt } from '@/components/ui/ConfirmProvider'
import { useToast } from '@/components/ui/Toast'
import { exportFileName, parseImportFile, ImportError } from '@/services/storage/exportImport'
import { downloadJson } from './download'
import { cn } from '@/lib/cn'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const tabTrigger =
  'rounded-xs border border-transparent px-3 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink data-[state=active]:border-line data-[state=active]:bg-inset data-[state=active]:text-ink'

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings" wide>
      <Tabs.Root defaultValue="profile">
        <Tabs.List
          className="mb-4 flex gap-1 border-b border-line pb-2"
          aria-label="Settings sections"
        >
          <Tabs.Trigger value="profile" className={tabTrigger}>
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger value="appearance" className={tabTrigger}>
            Appearance
          </Tabs.Trigger>
          <Tabs.Trigger value="calendar" className={tabTrigger}>
            Calendar
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="profile">
          <ProfileTab />
        </Tabs.Content>
        <Tabs.Content value="appearance">
          <AppearanceTab />
        </Tabs.Content>
        <Tabs.Content value="calendar">
          <CalendarTab />
        </Tabs.Content>
      </Tabs.Root>
    </Dialog>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mt-6 mb-2 text-[13px] font-semibold tracking-[0.5px] text-ink-faint uppercase first:mt-0">
      {children}
    </h3>
  )
}

function ProfileTab() {
  const session = useSession()
  const profiles = useProfilesState((s) => s.profiles)
  const activeProfileId = useProfilesState((s) => s.activeProfileId)
  const prompt = usePrompt()
  const confirm = useConfirm()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const active = profiles.find((p) => p.id === activeProfileId)

  const addProfile = async () => {
    const name = await prompt({
      title: 'New Profile',
      label: 'Profile name',
      saveLabel: 'Create',
      validate: (v) => (v.trim() ? null : 'Profile name is required'),
    })
    if (name === null) return
    const result = session.createProfile(name)
    if (result.ok) toast.success(`Created profile ${name.trim()}`)
    else toast.error(result.error)
  }

  const renameActive = async () => {
    if (!active) return
    const name = await prompt({
      title: 'Rename Profile',
      label: 'Profile name',
      initialValue: active.name,
      validate: (v) => (v.trim() ? null : 'Profile name is required'),
    })
    if (name === null) return
    const result = session.renameProfile(active.id, name)
    if (result.ok) toast.success('Profile renamed')
    else toast.error(result.error)
  }

  const deleteActive = async () => {
    if (!active) return
    const ok = await confirm({
      title: 'Delete Profile?',
      message: `Delete "${active.name}" and all of its data? This cannot be undone.`,
      confirmLabel: 'Delete',
      dangerous: true,
    })
    if (!ok) return
    session.deleteProfile(active.id)
    toast.success('Profile deleted')
  }

  const exportProfile = () => {
    const file = session.buildExport()
    downloadJson(exportFileName(file.profile.name, new Date()), file)
    toast.success('Profile exported')
  }

  const importProfile = (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseImportFile(JSON.parse(String(reader.result)))
        const imported = session.importProfile(parsed)
        toast.success(`Imported as ${imported.name}`)
      } catch (error) {
        toast.error(error instanceof ImportError ? error.message : 'Could not read this file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <SectionTitle>Profiles</SectionTitle>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Active profile">
            {(id) => (
              <Select
                id={id}
                value={activeProfileId}
                onChange={(e) => session.switchProfile(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Button onClick={() => void renameActive()} aria-label="Rename profile">
          Rename
        </Button>
        <Button onClick={() => void addProfile()} aria-label="Add profile">
          Add
        </Button>
      </div>

      <SectionTitle>Local Data</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportProfile}>Export Data</Button>
        <Button onClick={() => fileInput.current?.click()}>Import Data</Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Import file"
          onChange={(e) => {
            importProfile(e.target.files)
            e.target.value = ''
          }}
        />
        <Button variant="danger" onClick={() => void deleteActive()} aria-label="Delete profile">
          Delete Profile
        </Button>
      </div>
    </div>
  )
}

function AppearanceTab() {
  const settings = useAppState((s) => s.data.settings)
  const { applyColorTheme } = useAppActions()
  const toast = useToast()
  const [pendingTheme, setPendingTheme] = useState(settings.colorTheme)
  const [pendingHue, setPendingHue] = useState(settings.baseColorHue)

  const isDirty = pendingTheme !== settings.colorTheme || pendingHue !== settings.baseColorHue

  const apply = () => {
    applyColorTheme(pendingTheme, pendingHue)
    toast.success('Course colors updated')
  }

  const cancel = () => {
    setPendingTheme(settings.colorTheme)
    setPendingHue(settings.baseColorHue)
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Course colors">
        {(id) => (
          <Select
            id={id}
            value={pendingTheme}
            onChange={(e) => setPendingTheme(e.target.value as typeof pendingTheme)}
          >
            <option value="colorful">Rainbow</option>
            <option value="single">Monochromatic</option>
            <option value="mono">Grayscale</option>
          </Select>
        )}
      </Field>

      {pendingTheme === 'single' ? (
        <Field label="Base hue">
          {(id) => (
            <div className="flex items-center gap-3">
              <input
                id={id}
                type="range"
                min={0}
                max={360}
                value={pendingHue}
                onChange={(e) => setPendingHue(Number(e.target.value))}
                className="hue-slider flex-1"
              />
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded-xs border border-line"
                style={{ backgroundColor: `hsl(${pendingHue}, 45%, 50%)` }}
              />
            </div>
          )}
        </Field>
      ) : null}

      {isDirty ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#e74c3c]">(unsaved changes)</span>
          <Button variant="primary" size="sm" onClick={apply}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <p className="text-xs text-ink-faint">
          Changing the scheme recolors all courses in every semester.
        </p>
      )}
    </div>
  )
}

function CalendarTab() {
  const semester = useAppState((s) => s.data.semesters.find((x) => x.id === s.currentSemesterId))
  const { updateCalendarSettings } = useAppActions()
  const toast = useToast()
  const [startHour, setStartHour] = useState(String(semester?.calendarSettings.startHour ?? 8))
  const [endHour, setEndHour] = useState(String(semester?.calendarSettings.endHour ?? 20))
  const [days, setDays] = useState<number[]>(
    semester?.calendarSettings.visibleDays ?? [0, 1, 2, 3, 4, 5],
  )
  const [error, setError] = useState<string | null>(null)

  if (!semester) {
    return (
      <p className="text-sm text-ink-muted">Create a semester first to configure its calendar.</p>
    )
  }

  const toggleDay = (day: number) => {
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
    updateCalendarSettings(semester.id, { startHour: start, endHour: end, visibleDays: days })
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
              onChange={(e) => setStartHour(e.target.value)}
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
              onChange={(e) => setEndHour(e.target.value)}
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
