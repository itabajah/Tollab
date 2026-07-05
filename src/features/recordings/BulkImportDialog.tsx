import { useEffect, useState } from 'react'
import { useAppActions } from '@/hooks/session'
import { useToast } from '@/components/ui/Toast'
import { Dialog, DialogActions } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field, Input, Select } from '@/components/ui/Field'
import {
  runRecordingImport,
  RecordingImportError,
  type ImportedRecording,
  type RecordingSource,
} from '@/services/importers/recordingsImport'

type Importer = (source: RecordingSource, url: string) => Promise<ImportedRecording[]>

const SOURCE_LABELS: Record<RecordingSource, { label: string; placeholder: string; hint: string }> =
  {
    youtube: {
      label: 'YouTube playlist',
      placeholder: 'https://www.youtube.com/playlist?list=…',
      hint: 'Paste the full playlist URL (must contain list=…).',
    },
    panopto: {
      label: 'Panopto folder',
      placeholder: 'https://…panopto…/Panopto/Pages/Sessions/List.aspx?folderID=…',
      hint: 'Paste the folder page URL.',
    },
  }

/**
 * Bulk-imports recordings from a YouTube playlist or a Panopto folder into the
 * active tab: fetch → preview checklist (select which to keep) → add. The
 * importer is injectable so the flow is testable without network access.
 */
export function BulkImportDialog({
  open,
  onOpenChange,
  courseId,
  tabId,
  tabName,
  importer = runRecordingImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  tabId: string
  tabName: string
  importer?: Importer
}) {
  const { addRecordings } = useAppActions()
  const toast = useToast()

  const [source, setSource] = useState<RecordingSource>('youtube')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ImportedRecording[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [useOriginalTitles, setUseOriginalTitles] = useState(true)

  // Reset everything whenever the dialog opens so a previous run never lingers.
  useEffect(() => {
    if (open) {
      setSource('youtube')
      setUrl('')
      setBusy(false)
      setError(null)
      setResults(null)
      setSelected(new Set())
      setUseOriginalTitles(true)
    }
  }, [open])

  const fetchList = async () => {
    // Guard against overlapping fetches (e.g. mashing Enter): the CORS-proxy
    // chain can take seconds, and a second run would stomp the first's result.
    if (busy) return
    if (!url.trim()) {
      setError('Paste a link first.')
      return
    }
    setBusy(true)
    setError(null)
    setResults(null)
    try {
      const items = await importer(source, url.trim())
      setResults(items)
      setSelected(new Set(items.map((_, i) => i)))
    } catch (e) {
      setError(
        e instanceof RecordingImportError ? e.message : 'Could not fetch that link. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const toggle = (index: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  const allSelected = results !== null && selected.size === results.length && results.length > 0
  const someSelected = results !== null && selected.size > 0 && !allSelected
  const toggleAll = () => {
    if (!results) return
    setSelected(allSelected ? new Set() : new Set(results.map((_, i) => i)))
  }

  const add = () => {
    if (!results) return
    const chosen = results.filter((_, i) => selected.has(i))
    if (chosen.length === 0) return
    addRecordings(
      courseId,
      tabId,
      chosen.map((r) => ({
        videoLink: r.videoLink,
        ...(useOriginalTitles ? { name: r.name } : {}),
      })),
    )
    toast.success(`Added ${chosen.length} recording${chosen.length === 1 ? '' : 's'} to ${tabName}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Bulk import recordings" wide>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_1fr] items-end gap-3">
          <Field label="Source">
            {(id) => (
              <Select
                id={id}
                value={source}
                disabled={busy}
                onChange={(e) => {
                  setSource(e.target.value as RecordingSource)
                  setResults(null)
                  setError(null)
                }}
              >
                <option value="youtube">YouTube</option>
                <option value="panopto">Panopto</option>
              </Select>
            )}
          </Field>
          <Field
            label={SOURCE_LABELS[source].label}
            hint={SOURCE_LABELS[source].hint}
            error={error}
          >
            {(id) => (
              <Input
                id={id}
                value={url}
                disabled={busy}
                aria-invalid={error ? true : undefined}
                placeholder={SOURCE_LABELS[source].placeholder}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void fetchList()
                  }
                }}
              />
            )}
          </Field>
        </div>

        <div>
          <Button variant="primary" loading={busy} onClick={() => void fetchList()}>
            {busy ? 'Fetching…' : 'Fetch list'}
          </Button>
        </div>

        {busy ? (
          <ul
            aria-hidden="true"
            className="flex flex-col gap-1.5 rounded-card border border-line p-2"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="h-5 animate-pulse rounded bg-inset" />
            ))}
          </ul>
        ) : results !== null ? (
          results.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                  />
                  {selected.size} of {results.length} selected
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
                  <Checkbox
                    aria-label="Use original titles"
                    checked={useOriginalTitles}
                    onCheckedChange={setUseOriginalTitles}
                  />
                  Use original titles
                </label>
              </div>

              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-card border border-line p-2">
                {results.map((item, index) => (
                  <li key={`${item.videoLink}-${index}`}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-control px-1 py-0.5 text-sm text-ink hover:bg-inset">
                      <Checkbox
                        aria-label={item.name}
                        checked={selected.has(index)}
                        onCheckedChange={() => toggle(index)}
                      />
                      <span className="truncate" title={item.name}>
                        {item.name}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : null}

        <DialogActions>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={selected.size === 0}
            onClick={add}
            aria-label="Add selected recordings"
          >
            Add {selected.size > 0 ? selected.size : ''} to {tabName}
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  )
}
