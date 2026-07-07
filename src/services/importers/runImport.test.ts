import {
  runIcsImport,
  runCatalogEnrichment,
  runBatchIcsImport,
  fetchTechnionCatalog,
  enrichSemesterCourses,
  deriveIcsBaseUrl,
  icsFileName,
  BatchIcsError,
  type BatchProgress,
} from './runImport'
import { appDataSchema, type AppData } from '@/domain/model'
import { createCourse, type CourseInput } from '@/domain/course'

const NOW = '2026-07-04T10:00:00.000Z'

const input: CourseInput = {
  name: 'Algorithms 1',
  number: '234247',
  points: '',
  lecturer: '',
  faculty: '',
  location: '',
  grade: '',
  syllabus: '',
  notes: '',
  hue: 0,
  exams: { moedA: '', moedB: '' },
  schedule: [],
}

function baseData(): AppData {
  return appDataSchema.parse({ semesters: [], settings: {}, lastModified: NOW })
}

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'SUMMARY:הרצאה - אלגוריתמים 1',
  'DTSTART:20260301T103000',
  'DTEND:20260301T123000',
  'LOCATION:Taub 2',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

const CATALOG_LAST = JSON.stringify([{ year: 2025, semester: 200 }])
const CATALOG_COURSES = JSON.stringify([
  {
    general: {
      'מספר מקצוע': '234247',
      'שם מקצוע': 'אלגוריתמים 1',
      נקודות: '3.0',
      אחראים: 'פרופ׳ כהן',
      פקולטה: 'מדעי המחשב',
      סילבוס: 'תיאור הקורס',
      'מועד א': '01-02-2026',
      'מועד ב': '01-03-2026',
    },
  },
])

/** A fetch mock serving the Technion catalog for GitHub-raw URLs and `ics` elsewhere. */
function enrichmentFetch(ics: string) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('last_semesters')) return new Response(CATALOG_LAST, { status: 200 })
    if (url.includes('courses_')) return new Response(CATALOG_COURSES, { status: 200 })
    return new Response(ics, { status: 200 })
  })
}

describe('runIcsImport', () => {
  it('fetches, parses and applies an ICS calendar', async () => {
    const fetchImpl = vi.fn(async () => new Response(ICS, { status: 200 }))
    const result = await runIcsImport(baseData(), 'https://cheesefork.cf/calendar.ics', {
      semesterName: 'Spring 2026',
      nowIso: NOW,
      fetchImpl,
    })
    expect(fetchImpl).toHaveBeenCalled()
    expect(result.report.createdSemester).toBe(true)
    const semester = result.data.semesters.find((s) => s.name === 'Spring 2026')!
    expect(semester.courses.some((c) => c.name.includes('אלגוריתמים'))).toBe(true)
  })

  it('throws when all proxies fail', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 500 }))
    await expect(
      runIcsImport(baseData(), 'https://cheesefork.cf/calendar.ics', {
        semesterName: 'Spring 2026',
        nowIso: NOW,
        fetchImpl,
        delayFn: async () => {},
      }),
    ).rejects.toThrow()
  })

  it('skips a proxy that answers 200 with its own (non-ICS) page and uses the next', async () => {
    let call = 0
    const fetchImpl = vi.fn(async () => {
      call += 1
      // First proxy: a rate-limit / API-key landing page that is NOT an ICS. It
      // must be rejected (not parsed as an empty schedule) so the next proxy runs.
      if (call === 1) {
        return new Response('<html>proxy: please request an API key</html>', { status: 200 })
      }
      return new Response(ICS, { status: 200 })
    })
    const result = await runIcsImport(baseData(), 'https://cheesefork.cf/calendar.ics', {
      semesterName: 'Spring 2026',
      nowIso: NOW,
      fetchImpl,
      delayFn: async () => {},
      enrich: false,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const semester = result.data.semesters.find((s) => s.id === result.semesterId)!
    expect(semester.courses.some((c) => c.name.includes('אלגוריתמים'))).toBe(true)
  })

  it('auto-enriches the imported semester from the Technion catalog', async () => {
    const result = await runIcsImport(baseData(), 'https://cheesefork.cf/calendar.ics', {
      semesterName: 'Spring 2026',
      nowIso: NOW,
      fetchImpl: enrichmentFetch(ICS),
    })
    const semester = result.data.semesters.find((s) => s.id === result.semesterId)!
    const course = semester.courses[0]!
    expect(course.points).toBe('3.0')
    expect(course.lecturer).toBe('פרופ׳ כהן')
    expect(course.syllabus).toBe('תיאור הקורס')
    expect(course.exams.moedA).toBe('2026-02-01')
    expect(result.enrichedCount).toBe(1)
  })

  it('skips enrichment (and the catalog download) when enrich is false', async () => {
    const fetchImpl = enrichmentFetch(ICS)
    const result = await runIcsImport(baseData(), 'https://cheesefork.cf/calendar.ics', {
      semesterName: 'Spring 2026',
      nowIso: NOW,
      fetchImpl,
      enrich: false,
    })
    expect(result.enrichedCount).toBe(0)
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes('last_semesters'))).toBe(false)
    const course = result.data.semesters.find((s) => s.id === result.semesterId)!.courses[0]!
    expect(course.points).toBe('') // left untouched by the catalog
  })

  it('still imports the schedule when the catalog is unreachable (best-effort enrich)', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      // Catalog endpoints fail; the ICS (via the proxy) succeeds.
      if (url.includes('last_semesters') || url.includes('courses_'))
        return new Response('', { status: 500 })
      return new Response(ICS, { status: 200 })
    })
    const result = await runIcsImport(baseData(), 'https://cheesefork.cf/calendar.ics', {
      semesterName: 'Spring 2026',
      nowIso: NOW,
      fetchImpl,
    })
    const semester = result.data.semesters.find((s) => s.id === result.semesterId)!
    expect(semester.courses.some((c) => c.name.includes('אלגוריתמים'))).toBe(true)
    expect(result.enrichedCount).toBe(0)
  })

  it('returns the input data by reference when a re-import and enrich both no-op', async () => {
    // First import creates + enriches the semester to a fully-populated state.
    const seeded = await runIcsImport(baseData(), 'https://cheesefork.cf/calendar.ics', {
      semesterName: 'Spring 2026',
      nowIso: NOW,
      fetchImpl: enrichmentFetch(ICS),
    })
    // Re-importing the identical ICS + catalog changes nothing, so the whole
    // chain must hand back the exact input reference — reconcileImport relies on
    // this to avoid clobbering a cloud edit that synced in during the fetch.
    const again = await runIcsImport(seeded.data, 'https://cheesefork.cf/calendar.ics', {
      semesterName: 'Spring 2026',
      nowIso: '2027-01-01T00:00:00.000Z',
      fetchImpl: enrichmentFetch(ICS),
    })
    expect(again.data).toBe(seeded.data)
    expect(again.enrichedCount).toBe(0)
  })
})

describe('deriveIcsBaseUrl / icsFileName', () => {
  it('strips the trailing .ics filename to the folder url', () => {
    expect(deriveIcsBaseUrl('https://cheesefork.cf/ical/winter-2024-2025.ics')).toBe(
      'https://cheesefork.cf/ical/',
    )
    expect(deriveIcsBaseUrl('https://cheesefork.cf/ical/')).toBeNull()
  })

  it('builds the Cheesefork filename, winter spanning two years', () => {
    expect(icsFileName({ season: 'Winter', year: 2024 })).toBe('winter-2024-2025.ics')
    expect(icsFileName({ season: 'Spring', year: 2025 })).toBe('spring-2025.ics')
    expect(icsFileName({ season: 'Summer', year: 2025 })).toBe('summer-2025.ics')
  })
})

describe('runBatchIcsImport', () => {
  const ICS_FOR = (name: string) =>
    [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      `SUMMARY:הרצאה - ${name}`,
      'DTSTART:20260301T103000',
      'DTEND:20260301T123000',
      'LOCATION:Taub 2',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

  it('imports each semester in the range into its own semester, skipping 404s', async () => {
    // Range Winter 2024 → Summer 2024 = 3 semesters; spring-2024 404s (skipped).
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('spring-2024')) return new Response('', { status: 404 })
      if (url.includes('winter-2024-2025'))
        return new Response(ICS_FOR('קורס חורף'), { status: 200 })
      if (url.includes('summer-2024')) return new Response(ICS_FOR('קורס קיץ'), { status: 200 })
      return new Response('', { status: 404 })
    })

    const result = await runBatchIcsImport(
      baseData(),
      'https://cheesefork.cf/ical/winter-2024-2025.ics',
      { season: 'Winter', year: 2024 },
      { season: 'Summer', year: 2024 },
      { semesterName: '', nowIso: NOW, fetchImpl, delayFn: async () => {} },
    )

    expect(result.imported.map((i) => i.name)).toEqual(['Winter 2024-2025', 'Summer 2024'])
    expect(result.skipped).toEqual(['Spring 2024'])
    expect(result.data.semesters.map((s) => s.name).sort()).toEqual([
      'Summer 2024',
      'Winter 2024-2025',
    ])
  })

  it('skips a semester whose ICS fetches but is empty (no blank semester created)', async () => {
    // Spring 2024 fetches 200 OK but has no events — it must be skipped, not
    // turned into an empty semester.
    const EMPTY_ICS = ['BEGIN:VCALENDAR', 'END:VCALENDAR'].join('\r\n')
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('winter-2024-2025'))
        return new Response(ICS_FOR('קורס חורף'), { status: 200 })
      if (url.includes('spring-2024')) return new Response(EMPTY_ICS, { status: 200 })
      if (url.includes('summer-2024')) return new Response(ICS_FOR('קורס קיץ'), { status: 200 })
      return new Response('', { status: 404 })
    })

    const result = await runBatchIcsImport(
      baseData(),
      'https://cheesefork.cf/ical/winter-2024-2025.ics',
      { season: 'Winter', year: 2024 },
      { season: 'Summer', year: 2024 },
      { semesterName: '', nowIso: NOW, fetchImpl, delayFn: async () => {} },
    )

    expect(result.imported.map((i) => i.name)).toEqual(['Winter 2024-2025', 'Summer 2024'])
    expect(result.skipped).toEqual(['Spring 2024'])
    expect(result.data.semesters.map((s) => s.name).sort()).toEqual([
      'Summer 2024',
      'Winter 2024-2025',
    ])
  })

  it('reports progress for the range (Preparing → each semester → Done)', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('winter-2024-2025'))
        return new Response(ICS_FOR('קורס חורף'), { status: 200 })
      if (url.includes('summer-2024')) return new Response(ICS_FOR('קורס קיץ'), { status: 200 })
      return new Response('', { status: 404 }) // spring-2024 + catalog
    })
    const seen: BatchProgress[] = []

    await runBatchIcsImport(
      baseData(),
      'https://cheesefork.cf/ical/winter-2024-2025.ics',
      { season: 'Winter', year: 2024 },
      { season: 'Summer', year: 2024 },
      {
        semesterName: '',
        nowIso: NOW,
        fetchImpl,
        delayFn: async () => {},
        onProgress: (p) => seen.push(p),
      },
    )

    expect(seen[0]).toEqual({ completed: 0, total: 3, current: 'Preparing…' })
    expect(seen.at(-1)).toEqual({ completed: 3, total: 3, current: 'Done' })
    expect(seen.map((p) => p.current)).toContain('Winter 2024-2025')
    expect(seen.every((p) => p.total === 3)).toBe(true)
  })

  it('throws when the sample url is not an .ics link', async () => {
    await expect(
      runBatchIcsImport(
        baseData(),
        'https://cheesefork.cf/ical/',
        { season: 'Winter', year: 2024 },
        { season: 'Winter', year: 2024 },
        { semesterName: '', nowIso: NOW },
      ),
    ).rejects.toThrow(BatchIcsError)
  })

  it('throws when start is after end', async () => {
    await expect(
      runBatchIcsImport(
        baseData(),
        'https://cheesefork.cf/ical/winter-2024-2025.ics',
        { season: 'Summer', year: 2025 },
        { season: 'Winter', year: 2025 },
        {
          semesterName: '',
          nowIso: NOW,
          fetchImpl: vi.fn(async () => new Response('', { status: 200 })),
        },
      ),
    ).rejects.toThrow(BatchIcsError)
  })

  it('enriches every imported semester, downloading the catalog only once', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('last_semesters')) return new Response(CATALOG_LAST, { status: 200 })
      if (url.includes('courses_')) return new Response(CATALOG_COURSES, { status: 200 })
      if (url.includes('winter-2024-2025'))
        return new Response(ICS_FOR('234247 - אלגוריתמים 1'), { status: 200 })
      if (url.includes('summer-2024')) return new Response(ICS_FOR('קורס קיץ'), { status: 200 })
      return new Response('', { status: 404 })
    })

    const result = await runBatchIcsImport(
      baseData(),
      'https://cheesefork.cf/ical/winter-2024-2025.ics',
      { season: 'Winter', year: 2024 },
      { season: 'Summer', year: 2024 },
      { semesterName: '', nowIso: NOW, fetchImpl, delayFn: async () => {} },
    )

    // The catalog index is fetched exactly once for the whole range, not per semester.
    const lastCalls = fetchImpl.mock.calls.filter(([u]) => String(u).includes('last_semesters'))
    expect(lastCalls).toHaveLength(1)
    // The Winter course (234247) matches the catalog and is enriched.
    const enrichedTotal = result.imported.reduce((n, i) => n + i.enriched, 0)
    expect(enrichedTotal).toBe(1)
  })

  it('imports without touching the catalog when enrich is false', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('winter-2024-2025'))
        return new Response(ICS_FOR('234247 - אלגוריתמים 1'), { status: 200 })
      return new Response('', { status: 404 })
    })

    const result = await runBatchIcsImport(
      baseData(),
      'https://cheesefork.cf/ical/winter-2024-2025.ics',
      { season: 'Winter', year: 2024 },
      { season: 'Winter', year: 2024 },
      { semesterName: '', nowIso: NOW, fetchImpl, delayFn: async () => {}, enrich: false },
    )

    expect(result.imported.reduce((n, i) => n + i.enriched, 0)).toBe(0)
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes('last_semesters'))).toBe(false)
  })
})

describe('runCatalogEnrichment', () => {
  it('fills empty course fields from the Technion catalog without overwriting', async () => {
    const data = baseData()
    data.semesters.push({
      id: 's1',
      name: 'Winter 2025-2026',
      courses: [createCourse(input, 'colorful')],
      calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
      examViewMode: 'auto',
      hiddenExamIds: [],
      customExams: [],
    })

    const lastSemesters = JSON.stringify([{ year: 2025, semester: 200 }])
    const courses = JSON.stringify([
      {
        general: {
          'מספר מקצוע': '234247',
          'שם מקצוע': 'אלגוריתמים 1',
          נקודות: '3.0',
          אחראים: 'פרופ׳ כהן',
          פקולטה: 'מדעי המחשב',
          'מועד א': '01-02-2026',
          'מועד ב': '01-03-2026',
        },
      },
    ])

    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('last_semesters')) return new Response(lastSemesters, { status: 200 })
      return new Response(courses, { status: 200 })
    })

    const result = await runCatalogEnrichment(data, 's1', { fetchImpl, nowIso: NOW })
    const course = result.data.semesters[0]!.courses[0]!
    expect(course.points).toBe('3.0')
    expect(course.lecturer).toBe('פרופ׳ כהן')
    expect(course.exams.moedA).toBe('2026-02-01')
    expect(course.number).toBe('234247') // unchanged, was already set
    expect(result.updatedCount).toBe(1)
  })

  it('is a no-op when the semester has no matching catalog entries', async () => {
    const data = baseData()
    data.semesters.push({
      id: 's1',
      name: 'Winter 2025-2026',
      courses: [createCourse({ ...input, number: '999999' }, 'colorful')],
      calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
      examViewMode: 'auto',
      hiddenExamIds: [],
      customExams: [],
    })
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('last_semesters'))
        return new Response(JSON.stringify([{ year: 2025, semester: 200 }]), { status: 200 })
      return new Response('[]', { status: 200 })
    })
    const result = await runCatalogEnrichment(data, 's1', { fetchImpl, nowIso: NOW })
    expect(result.updatedCount).toBe(0)
  })

  it('does not churn identity or bump lastModified on a no-op enrichment', async () => {
    const data = baseData()
    const course = createCourse(
      {
        ...input,
        points: '3.0',
        lecturer: 'פרופ׳ כהן',
        faculty: 'מדעי המחשב',
        syllabus: 'סילבוס',
        exams: { moedA: '2026-02-01', moedB: '2026-03-01' },
      },
      'colorful',
    )
    data.semesters.push({
      id: 's1',
      name: 'Winter 2025-2026',
      courses: [course],
      calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
      examViewMode: 'auto',
      hiddenExamIds: [],
      customExams: [],
    })

    const lastSemesters = JSON.stringify([{ year: 2025, semester: 200 }])
    const courses = JSON.stringify([
      {
        general: {
          'מספר מקצוע': '234247',
          'שם מקצוע': 'אלגוריתמים 1',
          נקודות: '3.0',
          אחראים: 'פרופ׳ אחר',
          פקולטה: 'מדעי המחשב',
          'מועד א': '01-02-2026',
          'מועד ב': '01-03-2026',
        },
      },
    ])

    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('last_semesters')) return new Response(lastSemesters, { status: 200 })
      return new Response(courses, { status: 200 })
    })

    const result = await runCatalogEnrichment(data, 's1', {
      fetchImpl,
      nowIso: '2027-01-01T00:00:00.000Z',
    })

    expect(result.updatedCount).toBe(0)
    expect(result.data).toBe(data)
    expect(result.data.lastModified).toBe(NOW)
    expect(result.data.semesters[0]!.courses[0]!).toBe(course)
  })

  it('skips the catalog download entirely when the semester is absent', async () => {
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200 }))
    const data = baseData()
    const result = await runCatalogEnrichment(data, 'missing', { fetchImpl, nowIso: NOW })
    expect(result.data).toBe(data)
    expect(result.updatedCount).toBe(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('fetchTechnionCatalog', () => {
  it('merges every listed semester file into one map', async () => {
    const catalog = await fetchTechnionCatalog({ fetchImpl: enrichmentFetch('') })
    expect(catalog.get('234247')?.lecturer).toBe('פרופ׳ כהן')
    expect(catalog.get('234247')?.syllabus).toBe('תיאור הקורס')
  })

  it('returns an empty catalog (never throws) when the index is unreachable', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 500 }))
    const catalog = await fetchTechnionCatalog({ fetchImpl })
    expect(catalog.size).toBe(0)
  })
})

describe('enrichSemesterCourses', () => {
  const catalog = new Map([
    [
      '234247',
      {
        number: '234247',
        name: 'אלגוריתמים 1',
        points: '3.0',
        lecturer: 'פרופ׳ כהן',
        faculty: 'מדעי המחשב',
        syllabus: 'תיאור הקורס',
        moedA: '2026-02-01',
        moedB: '',
      },
    ],
  ])

  function withCourse(): AppData {
    const data = baseData()
    data.semesters.push({
      id: 's1',
      name: 'Winter 2025-2026',
      courses: [createCourse(input, 'colorful')],
      calendarSettings: { startHour: 8, endHour: 20, visibleDays: [0, 1, 2, 3, 4, 5] },
      examViewMode: 'auto',
      hiddenExamIds: [],
      customExams: [],
    })
    return data
  }

  it('fills empty fields (including syllabus) from a pre-fetched catalog', () => {
    const result = enrichSemesterCourses(withCourse(), 's1', catalog, NOW)
    const course = result.data.semesters[0]!.courses[0]!
    expect(course.points).toBe('3.0')
    expect(course.syllabus).toBe('תיאור הקורס')
    expect(result.updatedCount).toBe(1)
  })

  it('is a no-op by reference when the semester is missing', () => {
    const data = withCourse()
    const result = enrichSemesterCourses(data, 'nope', catalog, NOW)
    expect(result.data).toBe(data)
    expect(result.updatedCount).toBe(0)
  })

  it('is a no-op by reference for an empty catalog', () => {
    const data = withCourse()
    const result = enrichSemesterCourses(data, 's1', new Map(), NOW)
    expect(result.data).toBe(data)
    expect(result.updatedCount).toBe(0)
  })
})
