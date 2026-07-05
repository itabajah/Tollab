import { useState } from 'react'
import type { RecordingSort } from '@/domain/model'
import { canDeleteTab, canRenameTab, sortRecordings } from '@/domain/recordings'
import { useAppActions, useAppState } from '@/hooks/session'
import { useToast } from '@/components/ui/Toast'
import { useConfirm, usePrompt } from '@/components/ui/ConfirmProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input, Select } from '@/components/ui/Field'
import { RecordingTabs } from './RecordingTabs'
import { RecordingRow } from './RecordingRow'
import { BulkImportDialog } from './BulkImportDialog'

const SORT_OPTIONS: ReadonlyArray<{ value: RecordingSort; label: string }> = [
  { value: 'default', label: 'Default (by #)' },
  { value: 'manual', label: 'Manual' },
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
  { value: 'unwatched_first', label: 'Unwatched first' },
  { value: 'watched_first', label: 'Watched first' },
]

/**
 * The Recordings tab of the course dialog: a sub-tab bar over the course's
 * recording tabs, per-tab actions (rename / clear / delete), a sort control,
 * an add-row for pasting video links, and the sorted list of recordings.
 */
export function RecordingsTab({ courseId }: { courseId: string }) {
  const course = useAppState((s) =>
    s.data.semesters
      .find((sem) => sem.id === s.currentSemesterId)
      ?.courses.find((c) => c.id === courseId),
  )
  const showWatched = useAppState((s) => s.data.settings.showWatchedRecordings)
  const actions = useAppActions()
  const toast = useToast()
  const confirm = useConfirm()
  const prompt = usePrompt()

  const [selectedTabId, setSelectedTabId] = useState('lectures')
  const [newLink, setNewLink] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)

  if (!course) return null

  const tabs = course.recordings.tabs
  // Fall back to the first tab if the selection points at a removed custom tab.
  const activeTab = tabs.find((t) => t.id === selectedTabId) ?? tabs[0]
  if (!activeTab) return null

  const sort = course.recordingsSort[activeTab.id] ?? 'default'
  const sorted = sortRecordings(activeTab.items, sort)
  const items = showWatched ? sorted : sorted.filter((item) => !item.watched)
  const hiddenWatched = activeTab.items.length - items.length

  const onAddTab = async () => {
    const name = await prompt({
      title: 'Add Tab',
      label: 'Tab name',
      validate: (v) => (v.trim() ? null : 'Tab name is required'),
    })
    if (name === null) return
    const id = actions.addRecordingTab(courseId, name)
    setSelectedTabId(id)
    toast.success(`Tab "${name.trim()}" created`)
  }

  const onRenameTab = async () => {
    if (!canRenameTab(activeTab.id)) return
    const name = await prompt({
      title: 'Rename Tab',
      label: 'Tab name',
      initialValue: activeTab.name,
      validate: (v) => (v.trim() ? null : 'Tab name is required'),
    })
    if (name === null) return
    actions.renameRecordingTab(courseId, activeTab.id, name)
    toast.success('Tab renamed')
  }

  const onClearTab = async () => {
    if (activeTab.items.length === 0) {
      toast.info('This tab is already empty')
      return
    }
    const ok = await confirm({
      title: 'Clear Tab',
      message: `Clear all ${activeTab.items.length} recordings from "${activeTab.name}"?`,
      description: 'This removes every recording in this tab and cannot be undone.',
      confirmLabel: 'Clear All',
      dangerous: true,
    })
    if (!ok) return
    actions.clearRecordingTab(courseId, activeTab.id)
    toast.success('Tab cleared')
  }

  const onDeleteTab = async () => {
    if (!canDeleteTab(activeTab.id)) return
    const suffix = activeTab.items.length ? ` and its ${activeTab.items.length} recordings` : ''
    const ok = await confirm({
      title: 'Delete Tab',
      message: `Delete the "${activeTab.name}" tab${suffix}?`,
      confirmLabel: 'Delete',
      dangerous: true,
    })
    if (!ok) return
    const name = activeTab.name
    actions.deleteRecordingTab(courseId, activeTab.id)
    setSelectedTabId('lectures')
    toast.success(`Tab "${name}" deleted`)
  }

  const onAddRecording = () => {
    const link = newLink.trim()
    if (!link) return
    actions.addRecording(courseId, activeTab.id, link)
    setNewLink('')
  }

  return (
    <div className="flex flex-col gap-3">
      <RecordingTabs
        tabs={tabs}
        selectedTabId={activeTab.id}
        onSelect={setSelectedTabId}
        onAddTab={() => void onAddTab()}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setBulkOpen(true)}>
            Bulk import
          </Button>
          {canRenameTab(activeTab.id) ? (
            <Button size="sm" variant="ghost" onClick={() => void onRenameTab()}>
              Rename tab
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => void onClearTab()}>
            Clear tab
          </Button>
          {canDeleteTab(activeTab.id) ? (
            <Button size="sm" variant="ghost" onClick={() => void onDeleteTab()}>
              Delete tab
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
            <Checkbox
              aria-label="Show watched"
              checked={showWatched}
              onCheckedChange={(c) => actions.updateSettings({ showWatchedRecordings: c })}
            />
            Show watched
          </label>
          <span className="text-[13px] tracking-[0.5px] text-ink-muted uppercase">Sort</span>
          <div className="w-48">
            <Select
              aria-label="Sort recordings"
              value={sort}
              onChange={(e) =>
                actions.setRecordingSort(courseId, activeTab.id, e.target.value as RecordingSort)
              }
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          {hiddenWatched > 0
            ? `All recordings watched — enable "Show watched" to see them.`
            : 'No recordings in this tab. Paste a video link below to add one.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <RecordingRow
              key={item.id}
              courseId={courseId}
              tabId={activeTab.id}
              item={item}
              sort={sort}
              isFirst={index === 0}
              isLast={index === items.length - 1}
            />
          ))}
        </ul>
      )}

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onAddRecording()
        }}
      >
        <Input
          aria-label="Video link"
          placeholder="Paste a video link (YouTube, Panopto, …)"
          value={newLink}
          onChange={(e) => setNewLink(e.target.value)}
        />
        <Button type="submit" variant="primary">
          Add
        </Button>
      </form>

      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        courseId={courseId}
        tabId={activeTab.id}
        tabName={activeTab.name}
      />
    </div>
  )
}
