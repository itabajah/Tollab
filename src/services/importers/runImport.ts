import type { AppData } from '@/domain/model'
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

  return {
    data: { ...data, semesters: nextSemesters, lastModified: options.nowIso },
    updatedCount,
  }
}
