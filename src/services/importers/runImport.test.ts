import {
  runIcsImport,
  runCatalogEnrichment,
  runBatchIcsImport,
  deriveIcsBaseUrl,
  icsFileName,
  BatchIcsError,
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
})
