import { useEffect, useState, type ReactNode } from 'react'
import { useAppActions } from '@/hooks/session'
import { useToast } from '@/components/ui/Toast'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Field, Input, TextArea } from '@/components/ui/Field'
import {
  runRecordingImport,
  parsePanoptoConsoleData,
  PANOPTO_CONSOLE_SNIPPET,
  RecordingImportError,
  type ImportedRecording,
  type RecordingSource,
} from '@/services/importers/recordingsImport'

type Importer = (source: RecordingSource, url: string) => Promise<ImportedRecording[]>

const YOUTUBE_PLACEHOLDER = 'https://www.youtube.com/playlist?list=…'
const YOUTUBE_HINT = 'Paste the full playlist URL (must contain list=…).'

const SOURCE_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'panopto', label: 'Panopto' },
] as const

/** A numbered step in the Panopto guide. */
function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-ink-muted">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-inset text-xs font-semibold text-ink">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-inset px-1 py-0.5 font-mono text-[11px] text-ink">
      {children}
    </kbd>
  )
}

/**
 * Bulk-imports recordings into the active tab. YouTube fetches a playlist by URL
 * (through the CORS-proxy chain). Panopto can't be fetched — private folders are
 * only visible to the signed-in browser — so it uses a guided console snippet:
 * the user runs it on the authenticated folder page, copies the result, and
 * pastes it back. Either way it ends in a preview checklist. The YouTube importer
 * is injectable so that flow is testable without network access.
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
  const [pasteText, setPasteText] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<ImportedRecording[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [useOriginalTitles, setUseOriginalTitles] = useState(true)

  // Reset everything whenever the dialog opens so a previous run never lingers.
  useEffect(() => {
    if (open) {
      setSource('youtube')
      setUrl('')
      setPasteText('')
      setBusy(false)
      setCopied(false)
      setError(null)
      setResults(null)
      setSelected(new Set())
      setUseOriginalTitles(true)
    }
  }, [open])

  const selectSource = (next: RecordingSource) => {
    setSource(next)
    setUrl('')
    setPasteText('')
    setResults(null)
    setError(null)
  }

  const showResults = (items: ImportedRecording[]) => {
    setResults(items)
    setSelected(new Set(items.map((_, i) => i)))
  }

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
      showResults(await importer(source, url.trim()))
    } catch (e) {
      setError(
        e instanceof RecordingImportError ? e.message : 'Could not fetch that link. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const copySnippet = () => {
    try {
      void navigator.clipboard.writeText(PANOPTO_CONSOLE_SNIPPET).then(
        () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        },
        () => {}, // Write rejected: the code is visible, so the user can select it.
      )
    } catch {
      // Clipboard API unavailable (non-secure context); the snippet is on screen.
    }
  }

  const onPastePanopto = (text: string) => {
    setPasteText(text)
    if (!text.trim()) {
      setResults(null)
      setError(null)
      return
    }
    const parsed = parsePanoptoConsoleData(text)
    if (parsed.length === 0) {
      setResults(null)
      setError("That doesn't look like the copied list. Re-run the snippet and paste its output.")
      return
    }
    setError(null)
    showResults(parsed)
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

  const hasResults = results !== null && results.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk import recordings"
      wide
      footer={
        <>
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
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="label-caps text-ink-muted">Source</span>
          <SegmentedControl
            aria-label="Recording source"
            options={SOURCE_OPTIONS}
            value={source}
            disabled={busy}
            onChange={(v) => selectSource(v)}
            className="self-start"
          />
        </div>

        {source === 'youtube' ? (
          <Field label="YouTube playlist" hint={YOUTUBE_HINT} error={error}>
            {(id) => (
              <div className="flex items-stretch gap-2">
                <Input
                  id={id}
                  value={url}
                  disabled={busy}
                  aria-invalid={error ? true : undefined}
                  placeholder={YOUTUBE_PLACEHOLDER}
                  className="flex-1"
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void fetchList()
                    }
                  }}
                />
                <Button
                  variant="primary"
                  loading={busy}
                  className="shrink-0 px-4"
                  onClick={() => void fetchList()}
                >
                  Fetch list
                </Button>
              </div>
            )}
          </Field>
        ) : (
          <div className="flex flex-col gap-3 rounded-card border border-line p-3">
            <p className="text-sm text-ink">
              Panopto needs you signed in, so grab the list from your own browser — no link works
              here.
            </p>
            <Step n={1}>
              Open your Panopto folder, sign in, and scroll down so every video loads.
            </Step>
            <Step n={2}>
              Press <Kbd>F12</Kbd> → <b className="font-semibold text-ink">Console</b>, paste this,
              and press <Kbd>Enter</Kbd>:
            </Step>
            <div className="flex items-stretch gap-2 pl-7">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-control border border-line bg-inset px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-ink">
                {PANOPTO_CONSOLE_SNIPPET}
              </code>
              <Button variant="secondary" className="shrink-0" onClick={copySnippet}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <Step n={3}>Come back here and paste the copied result:</Step>
            <div className="pl-7">
              <TextArea
                aria-label="Panopto data"
                value={pasteText}
                aria-invalid={error ? true : undefined}
                placeholder="Paste the copied list (Ctrl+V)…"
                className="font-mono text-xs"
                onChange={(e) => onPastePanopto(e.target.value)}
              />
              {error ? (
                <p role="alert" className="mt-1.5 text-xs text-error-text">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        )}

        {busy ? (
          <ul
            aria-hidden="true"
            className="flex flex-col gap-1.5 rounded-card border border-line p-2"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="h-7 animate-pulse rounded-control bg-inset" />
            ))}
          </ul>
        ) : results !== null ? (
          !hasResults ? (
            <div className="rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
              Nothing found.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                  />
                  {selected.size} of {results.length} selected
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                  <Checkbox
                    aria-label="Use original titles"
                    checked={useOriginalTitles}
                    onCheckedChange={setUseOriginalTitles}
                  />
                  Use original titles
                </label>
              </div>

              <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-card border border-line p-1.5">
                {results.map((item, index) => (
                  <li key={`${item.videoLink}-${index}`}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-control px-2 py-1.5 text-sm text-ink hover:bg-inset">
                      <Checkbox
                        aria-label={item.name}
                        checked={selected.has(index)}
                        onCheckedChange={() => toggle(index)}
                      />
                      <span className="min-w-0 flex-1 truncate" title={item.name}>
                        {item.name}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : source === 'youtube' ? (
          <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-xs text-ink-faint">
            Fetched videos will appear here to pick from before adding.
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
