import { useState } from 'react'
import { useAppActions, useAppState } from '@/hooks/session'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

export function AppearanceTab() {
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
          <span className="text-xs text-warning-text">(unsaved changes)</span>
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
