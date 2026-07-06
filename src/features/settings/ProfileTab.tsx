import { useRef } from 'react'
import { useProfilesState, useSession } from '@/hooks/session'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { useConfirm, usePrompt } from '@/components/ui/ConfirmProvider'
import { useToast } from '@/components/ui/Toast'
import { exportFileName, parseImportFile, ImportError } from '@/services/storage/exportImport'
import { CloudStatus } from '@/features/sync/CloudStatus'
import { downloadJson } from './download'
import { SectionTitle } from './SectionTitle'

export function ProfileTab() {
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

      <SectionTitle>Cloud Sync</SectionTitle>
      <CloudStatus />

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
        <Button
          variant="danger"
          className="ml-auto"
          onClick={() => void deleteActive()}
          aria-label="Delete profile"
        >
          Delete Profile
        </Button>
      </div>
    </div>
  )
}
