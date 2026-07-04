import { runIcsImport, runCatalogEnrichment } from './runImport'
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
          'נקודות': '3.0',
          'אחראים': 'פרופ׳ כהן',
          'פקולטה': 'מדעי המחשב',
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
})
