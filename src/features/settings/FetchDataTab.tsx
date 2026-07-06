import { useMemo, useState } from 'react'
import { sortSemesters } from '@/domain/semester'
import type { AppData } from '@/domain/model'
import { useAppState, useSession } from '@/hooks/session'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { reconcileImport } from '@/services/importers/applyImport'
import { SectionTitle } from './SectionTitle'

const BATCH_SEASONS = ['Winter', 'Spring', 'Summer'] as const
type BatchSeason = (typeof BATCH_SEASONS)[number]

/** Year choices for the batch range, relative to `now`: next year down to five back. */
function batchYearOptions(now: Date): number[] {
  const current = now.getFullYear()
  const years: number[] = []
  for (let y = current + 1; y >= current - 5; y--) years.push(y)
  return years
}

export function FetchDataTab() {
  const session = useSession()
  const semester = useAppState((s) => s.data.semesters.find((x) => x.id === s.currentSemesterId))
  const toast = useToast()
  const now = useNow()
  const [icsUrl, setIcsUrl] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [batch, setBatch] = useState(false)
  const years = useMemo(() => batchYearOptions(now), [now])
  const [startSeason, setStartSeason] = useState<BatchSeason>('Winter')
  const [startYear, setStartYear] = useState(years[years.length - 1]!)
  const [endSeason, setEndSeason] = useState<BatchSeason>('Winter')
  const [endYear, setEndYear] = useState(years[0]!)

  // A fetch can take seconds; a cloud-sync update may land while it runs. Re-read
  // the latest store data and overlay only the import-touched semesters onto it,
  // so a concurrent remote change isn't clobbered by the pre-fetch snapshot.
  const applyResult = (snapshot: AppData, importedData: AppData) => {
    const fresh = session.appStore.getState().data
    session.appStore.getState().setData(reconcileImport(fresh, snapshot, importedData))
    session.appStore.getState().touch()
  }

  const fetchRange = async () => {
    if (!icsUrl.trim()) {
      setStatus('Paste one Cheesefork ICS link (any semester) first.')
      return
    }
    setBusy(true)
    setStatus('Fetching semesters and course details…')
    const { runBatchIcsImport, BatchIcsError } = await import('@/services/importers/runImport')
    const snapshot = session.appStore.getState().data
    try {
      const result = await runBatchIcsImport(
        snapshot,
        icsUrl.trim(),
        { season: startSeason, year: startYear },
        { season: endSeason, year: endYear },
        { semesterName: '', nowIso: now.toISOString() },
      )
      applyResult(snapshot, result.data)
      if (result.imported.length === 0) {
        setStatus('No semesters found in that range.')
        toast.error('Batch import found nothing')
      } else {
        // Only switch selection when something was actually imported (sort is
        // newest-first); an empty range must not jump the user off their semester.
        const newest = sortSemesters(session.appStore.getState().data.semesters)[0]
        if (newest) session.appStore.getState().selectSemester(newest.id)
        const skipped = result.skipped.length ? ` Skipped: ${result.skipped.join(', ')}.` : ''
        const enrichedTotal = result.imported.reduce((n, i) => n + i.enriched, 0)
        const enriched = enrichedTotal
          ? ` Enriched ${enrichedTotal} from the Technion catalog.`
          : ''
        setStatus(`Imported ${result.imported.map((i) => i.name).join(', ')}.${enriched}${skipped}`)
        toast.success(`Imported ${result.imported.length} semesters`)
      }
    } catch (e) {
      setStatus(
        e instanceof BatchIcsError ? e.message : 'Could not fetch that range. Check the link.',
      )
      toast.error('Batch import failed')
    } finally {
      setBusy(false)
    }
  }

  const fetchSchedule = async () => {
    if (!icsUrl.trim()) {
      setStatus('Paste a Cheesefork ICS link first.')
      return
    }
    setBusy(true)
    setStatus('Fetching schedule and course details…')
    try {
      const { runIcsImport } = await import('@/services/importers/runImport')
      const snapshot = session.appStore.getState().data
      const result = await runIcsImport(snapshot, icsUrl.trim(), {
        // With no active semester the importer names the new one from the ICS itself.
        semesterName: semester?.name ?? '',
        nowIso: now.toISOString(),
      })
      applyResult(snapshot, result.data)
      // If we imported with no semester selected, switch to the one just created.
      if (!semester) {
        const newest = sortSemesters(session.appStore.getState().data.semesters)[0]
        if (newest) session.appStore.getState().selectSemester(newest.id)
      }
      const { createdCourses, updatedCourses } = result.report
      const enriched = result.enrichedCount
        ? ` Enriched ${result.enrichedCount} from the Technion catalog.`
        : ''
      setStatus(
        `Imported ${createdCourses.length} new, updated ${updatedCourses.length} courses.${enriched}`,
      )
      toast.success('Schedule imported')
    } catch {
      setStatus('Could not fetch the schedule. Check the link and try again.')
      toast.error('Schedule import failed')
    } finally {
      setBusy(false)
    }
  }

  const fetchCatalog = async () => {
    if (!semester) return
    setBusy(true)
    setStatus('Fetching course data from the Technion catalog…')
    try {
      const { runCatalogEnrichment } = await import('@/services/importers/runImport')
      const snapshot = session.appStore.getState().data
      const result = await runCatalogEnrichment(snapshot, semester.id, {
        nowIso: now.toISOString(),
      })
      applyResult(snapshot, result.data)
      setStatus(`Updated ${result.updatedCount} courses from the catalog.`)
      toast.success('Course data updated')
    } catch {
      setStatus('Could not fetch course data.')
      toast.error('Course data fetch failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionTitle>Import Schedule (Cheesefork)</SectionTitle>
        {!semester ? (
          <p className="mb-2 text-xs text-ink-faint">
            No semester yet — fetching a schedule creates one automatically from the link.
          </p>
        ) : null}
        <Field
          label="Cheesefork ICS link"
          hint="Paste the calendar export URL from cheesefork.cf — course details are pulled from the Technion automatically"
        >
          {(id) => (
            <Input
              id={id}
              value={icsUrl}
              placeholder="https://cheesefork.cf/…/calendar.ics"
              onChange={(e) => setIcsUrl(e.target.value)}
            />
          )}
        </Field>
        <Button
          className="mt-2"
          variant="primary"
          loading={busy}
          disabled={batch}
          onClick={() => void fetchSchedule()}
        >
          Fetch Schedule
        </Button>

        <label className="mt-3 flex cursor-pointer items-center gap-1.5 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={batch}
            disabled={busy}
            onChange={(e) => setBatch(e.target.checked)}
            className="size-4 accent-accent"
          />
          Fetch multiple semesters (batch)
        </label>

        {batch ? (
          <div className="mt-2 flex flex-col gap-3 rounded-xs border border-line bg-inset p-3">
            <p className="text-xs text-ink-faint">
              Uses the link above as a sample; each semester’s file is fetched from the same folder.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                {(id) => (
                  <div className="flex gap-2">
                    <Select
                      id={id}
                      aria-label="Start season"
                      value={startSeason}
                      onChange={(e) => setStartSeason(e.target.value as BatchSeason)}
                    >
                      {BATCH_SEASONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <Select
                      aria-label="Start year"
                      value={String(startYear)}
                      onChange={(e) => setStartYear(Number(e.target.value))}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </Field>
              <Field label="To">
                {(id) => (
                  <div className="flex gap-2">
                    <Select
                      id={id}
                      aria-label="End season"
                      value={endSeason}
                      onChange={(e) => setEndSeason(e.target.value as BatchSeason)}
                    >
                      {BATCH_SEASONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <Select
                      aria-label="End year"
                      value={String(endYear)}
                      onChange={(e) => setEndYear(Number(e.target.value))}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </Field>
            </div>
            <div>
              <Button variant="primary" loading={busy} onClick={() => void fetchRange()}>
                Fetch range
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {semester ? (
        <div>
          <SectionTitle>Enrich Course Data (Technion)</SectionTitle>
          <p className="mb-2 text-xs text-ink-faint">
            Fills missing points, lecturer, faculty, syllabus, and exam dates from the public
            Technion catalog — existing values are never overwritten. This runs automatically after
            a Cheesefork fetch; use it to re-check later (e.g. once exam dates are published).
          </p>
          <Button variant="secondary" loading={busy} onClick={() => void fetchCatalog()}>
            Fetch Course Data
          </Button>
        </div>
      ) : null}

      {status ? (
        <p role="status" aria-live="polite" className="text-xs text-ink-muted">
          {status}
        </p>
      ) : null}
    </div>
  )
}
