import type { AppData } from '@/domain/model'
import { buildSemesterRange, semesterName, type SemesterRef } from '@/domain/semester'
import { fetchViaProxies } from './corsProxy'
import { parseIcs } from './ics'
import { applyImportedCourses, type ImportReport } from './applyImport'
import {
  TECHNION_SAP_BASE_URL,
  catalogUrls,
  enrichCourse,
  matchCatalogEntry,
  parseCatalog,
  parseLastSemesters,
  type CatalogEntry,
} from './catalog'

/**
 * Orchestrators that combine fetching (CORS proxy / direct) with the pure
 * parsing/apply modules. `fetchImpl` is injectable so the whole flow is
 * testable without real network access.
 */

export interface IcsImportOptions {
  semesterName: string
  nowIso: string
  fetchImpl?: typeof fetch
  delayFn?: (ms: number) => Promise<void>
  /**
   * Enrich the imported semester from the Technion catalog right after the ICS is
   * applied (default `true`). Every Cheesefork fetch thus lands fully-populated
   * courses — points, lecturer, faculty, syllabus, exam dates — in one step.
   */
  enrich?: boolean
  /** A pre-fetched catalog to enrich from, so a batch downloads it only once. */
  catalog?: Map<string, CatalogEntry>
}

export interface IcsImportResult {
  data: AppData
  report: ImportReport
  /** The semester the courses were imported into (created or matched). */
  semesterId: string
  /** How many courses the follow-up catalog enrichment updated (0 if disabled/none). */
  enrichedCount: number
}

/**
 * A real Cheesefork calendar always opens with the VCALENDAR envelope. A public
 * proxy that has rate-limited us or wants an API key answers 200 with its OWN
 * HTML page instead — this guards against parsing that as an empty schedule and
 * silently "succeeding" with zero courses; the fetch falls through to the next
 * proxy instead.
 */
const looksLikeIcs = (body: string): boolean => body.includes('BEGIN:VCALENDAR')

/** Strips the trailing `<name>.ics` to get the folder URL the batch derives from. */
export function deriveIcsBaseUrl(url: string): string | null {
  const match = url.match(/^(.*\/)[^/]+\.ics$/i)
  return match?.[1] ?? null
}

/** The Cheesefork ICS filename for a semester, e.g. `winter-2024-2025.ics`. */
export function icsFileName(ref: SemesterRef): string {
  const yearPart = ref.season === 'Winter' ? `${ref.year}-${ref.year + 1}` : `${ref.year}`
  return `${ref.season.toLowerCase()}-${yearPart}.ics`
}

export interface BatchIcsResult {
  data: AppData
  imported: Array<{ name: string; created: number; updated: number; enriched: number }>
  skipped: string[]
}

export class BatchIcsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BatchIcsError'
  }
}

/**
 * Fetches every Cheesefork ICS in the [start, end] semester range, deriving each
 * per-semester URL from the sample link, and applies them one after another into
 * their own (created-if-missing) semester. Semesters whose file 404s or fails to
 * parse are skipped, not fatal.
 */
export async function runBatchIcsImport(
  data: AppData,
  sampleIcsUrl: string,
  start: SemesterRef,
  end: SemesterRef,
  options: IcsImportOptions,
): Promise<BatchIcsResult> {
  const base = deriveIcsBaseUrl(sampleIcsUrl)
  if (!base) {
    throw new BatchIcsError('Could not determine the base URL from that .ics link.')
  }
  const range = buildSemesterRange(start, end)
  if (range.length === 0) {
    throw new BatchIcsError('The start semester is after the end semester.')
  }

  // Download the (large) Technion catalog once and reuse it for every semester in
  // the range, rather than re-fetching it per import. Best-effort: a failure
  // yields an empty catalog and the schedules still import un-enriched.
  const catalog =
    options.enrich === false
      ? new Map<string, CatalogEntry>()
      : await fetchTechnionCatalog(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {})

  let current = data
  const imported: BatchIcsResult['imported'] = []
  const skipped: string[] = []

  for (const ref of range) {
    const name = semesterName(ref.season, ref.year)
    try {
      const result = await runIcsImport(current, base + icsFileName(ref), {
        semesterName: name,
        nowIso: options.nowIso,
        ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
        ...(options.delayFn ? { delayFn: options.delayFn } : {}),
        enrich: options.enrich !== false,
        catalog,
      })
      // A missing file (404) throws above and is skipped. A file that fetches but
      // holds no events — a semester not yet published, or an empty export —
      // would otherwise create a blank semester; skip those too rather than
      // littering the switcher with empties.
      if (result.report.createdSemester && result.report.createdCourses.length === 0) {
        skipped.push(name)
        continue
      }
      current = result.data
      imported.push({
        name,
        created: result.report.createdCourses.length,
        updated: result.report.updatedCourses.length,
        enriched: result.enrichedCount,
      })
    } catch {
      skipped.push(name)
    }
  }

  return { data: current, imported, skipped }
}

/**
 * Fetches a Cheesefork ICS URL through the proxy chain, applies it, and — unless
 * `enrich` is false — enriches the imported semester from the Technion catalog so
 * the fetch lands fully-populated courses in one step. Enrichment is best-effort:
 * an unreachable catalog simply leaves the imported schedule un-enriched.
 */
export async function runIcsImport(
  data: AppData,
  icsUrl: string,
  options: IcsImportOptions,
): Promise<IcsImportResult> {
  const text = await fetchViaProxies(icsUrl, {
    validate: looksLikeIcs,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.delayFn ? { delayFn: options.delayFn } : {}),
  })
  const { courses, semesterHint } = parseIcs(text)
  const semesterName = options.semesterName || semesterHint || 'Imported Semester'
  const applied = applyImportedCourses(data, semesterName, courses, options.nowIso)

  if (options.enrich === false) {
    return { ...applied, enrichedCount: 0 }
  }

  const catalog =
    options.catalog ??
    (await fetchTechnionCatalog(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}))
  const enriched = enrichSemesterCourses(applied.data, applied.semesterId, catalog, options.nowIso)
  return {
    data: enriched.data,
    report: applied.report,
    semesterId: applied.semesterId,
    enrichedCount: enriched.updatedCount,
  }
}

export interface CatalogFetchOptions {
  fetchImpl?: typeof fetch
  baseUrl?: string
}

export interface CatalogEnrichOptions extends CatalogFetchOptions {
  nowIso: string
}

export interface CatalogEnrichResult {
  data: AppData
  updatedCount: number
}

async function fetchJson(fetchImpl: typeof fetch, url: string): Promise<unknown | null> {
  try {
    const response = await fetchImpl(url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Fetches and merges the public Technion SAP catalog into one map keyed by
 * digit-stripped course number. Reads `last_semesters.json` (a direct fetch — no
 * proxy needed; GitHub raw sends permissive CORS) then every listed semester's
 * course file, first entry winning on collision. Every failure degrades to a
 * smaller/empty map rather than throwing, so enrichment is always best-effort.
 */
export async function fetchTechnionCatalog(
  options: CatalogFetchOptions = {},
): Promise<Map<string, CatalogEntry>> {
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = options.baseUrl ?? TECHNION_SAP_BASE_URL

  const catalog = new Map<string, CatalogEntry>()
  const lastRaw = await fetchJson(fetchImpl, catalogUrls(baseUrl, 0, 0).lastSemesters)
  for (const ref of parseLastSemesters(lastRaw)) {
    const url = catalogUrls(baseUrl, ref.year, ref.semester).courses
    const raw = await fetchJson(fetchImpl, url)
    if (!raw) continue
    for (const [number, entry] of parseCatalog(raw)) {
      if (!catalog.has(number)) catalog.set(number, entry)
    }
  }
  return catalog
}

/**
 * Pure: fills the empty fields of one semester's courses from an already-fetched
 * catalog, never overwriting existing values. A no-op (semester missing, empty
 * catalog, or every match already populated) returns `data` by reference and
 * leaves `lastModified` untouched, so `reconcileImport` can detect the no-change.
 */
export function enrichSemesterCourses(
  data: AppData,
  semesterId: string,
  catalog: Map<string, CatalogEntry>,
  nowIso: string,
): CatalogEnrichResult {
  const semesterIndex = data.semesters.findIndex((s) => s.id === semesterId)
  if (semesterIndex === -1 || catalog.size === 0) return { data, updatedCount: 0 }

  let updatedCount = 0
  const nextSemesters = data.semesters.map((semester, index) => {
    if (index !== semesterIndex) return semester
    const nextCourses = semester.courses.map((course) => {
      const entry = matchCatalogEntry(catalog, course)
      if (!entry) return course
      const enriched = enrichCourse(course, entry)
      if (enriched !== course) updatedCount++
      return enriched
    })
    return { ...semester, courses: nextCourses }
  })

  if (updatedCount === 0) return { data, updatedCount: 0 }

  return {
    data: { ...data, semesters: nextSemesters, lastModified: nowIso },
    updatedCount,
  }
}

/**
 * Enriches the target semester's courses with the public Technion SAP catalog,
 * filling only empty fields — the standalone "Fetch Course Data" action (a
 * Cheesefork import enriches inline, sharing one catalog download).
 */
export async function runCatalogEnrichment(
  data: AppData,
  semesterId: string,
  options: CatalogEnrichOptions,
): Promise<CatalogEnrichResult> {
  // Skip the (large) catalog download entirely when the semester isn't present.
  if (!data.semesters.some((s) => s.id === semesterId)) return { data, updatedCount: 0 }

  const catalog = await fetchTechnionCatalog({
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
  })
  return enrichSemesterCourses(data, semesterId, catalog, options.nowIso)
}
