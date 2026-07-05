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
}

export interface IcsImportResult {
  data: AppData
  report: ImportReport
}

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
  imported: Array<{ name: string; created: number; updated: number }>
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
      })
      current = result.data
      imported.push({
        name,
        created: result.report.createdCourses.length,
        updated: result.report.updatedCourses.length,
      })
    } catch {
      skipped.push(name)
    }
  }

  return { data: current, imported, skipped }
}

/** Fetches a Cheesefork ICS URL through the proxy chain and applies it. */
export async function runIcsImport(
  data: AppData,
  icsUrl: string,
  options: IcsImportOptions,
): Promise<IcsImportResult> {
  const text = await fetchViaProxies(icsUrl, {
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.delayFn ? { delayFn: options.delayFn } : {}),
  })
  const { courses, semesterHint } = parseIcs(text)
  const semesterName = options.semesterName || semesterHint || 'Imported Semester'
  return applyImportedCourses(data, semesterName, courses, options.nowIso)
}

export interface CatalogEnrichOptions {
  nowIso: string
  fetchImpl?: typeof fetch
  baseUrl?: string
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
 * Enriches the target semester's courses with the public Technion SAP catalog,
 * filling only empty fields. Reads `last_semesters.json` (direct fetch, no
 * proxy needed — GitHub raw sends permissive CORS) and merges every listed
 * semester's course file into one catalog.
 */
export async function runCatalogEnrichment(
  data: AppData,
  semesterId: string,
  options: CatalogEnrichOptions,
): Promise<CatalogEnrichResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = options.baseUrl ?? TECHNION_SAP_BASE_URL

  const semesterIndex = data.semesters.findIndex((s) => s.id === semesterId)
  if (semesterIndex === -1) return { data, updatedCount: 0 }

  const lastRaw = await fetchJson(fetchImpl, catalogUrls(baseUrl, 0, 0).lastSemesters)
  const refs = parseLastSemesters(lastRaw)
  if (refs.length === 0) return { data, updatedCount: 0 }

  const catalog = new Map<string, CatalogEntry>()
  for (const ref of refs) {
    const url = catalogUrls(baseUrl, ref.year, ref.semester).courses
    const raw = await fetchJson(fetchImpl, url)
    if (!raw) continue
    for (const [number, entry] of parseCatalog(raw)) {
      if (!catalog.has(number)) catalog.set(number, entry)
    }
  }
  if (catalog.size === 0) return { data, updatedCount: 0 }

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

  // A no-op enrichment (every matched course already fully populated) must not
  // churn object identity or bump lastModified — return the data untouched.
  if (updatedCount === 0) return { data, updatedCount: 0 }

  return {
    data: { ...data, semesters: nextSemesters, lastModified: options.nowIso },
    updatedCount,
  }
}
