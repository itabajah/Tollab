import icsFixture from './__fixtures__/cheesefork.ics?raw'
import { appDataSchema, type AppData } from '@/domain/model'
import { applyImportedCourses } from './applyImport'
import { parseIcs, type ImportedCourse } from './ics'

const NOW = '2026-07-05T10:00:00.000Z'

function makeImported(partial: Partial<ImportedCourse> & { name: string }): ImportedCourse {
  return {
    number: '',
    lecturers: [],
    locations: [],
    schedule: [],
    exams: { moedA: '', moedB: '' },
    ...partial,
  }
}

function makeData(semesters: unknown[] = [], settings: Record<string, unknown> = {}): AppData {
  return appDataSchema.parse({ semesters, settings, lastModified: '2026-01-01T00:00:00.000Z' })
}

const springWith = (courses: unknown[]): unknown => ({
  id: 'sem1',
  name: 'Spring 2026',
  courses,
})

const algoCourse = (overrides: Record<string, unknown> = {}): unknown => ({
  id: 'c1',
  name: 'אלגוריתמים 1',
  color: 'hsl(0, 45%, 50%)',
  ...overrides,
})

describe('applyImportedCourses — semesters', () => {
  it('creates a semester with a translated Hebrew name when none matches', () => {
    const result = applyImportedCourses(makeData(), 'אביב 2026', [makeImported({ name: 'קורס' })], NOW)

    expect(result.report.createdSemester).toBe(true)
    const semester = result.data.semesters[0]
    expect(semester?.name).toBe('Spring 2026')
    expect(semester?.id).toBeTruthy()
    expect(semester?.calendarSettings).toEqual({
      startHour: 8,
      endHour: 20,
      visibleDays: [0, 1, 2, 3, 4, 5],
    })
    expect(semester?.courses.map((c) => c.name)).toEqual(['קורס'])
  })

  it('reuses an existing semester case-insensitively and keeps its stored name', () => {
    const data = makeData([{ id: 'sem1', name: 'SPRING 2026', courses: [] }])
    const result = applyImportedCourses(data, 'Spring 2026', [makeImported({ name: 'קורס' })], NOW)

    expect(result.report.createdSemester).toBe(false)
    expect(result.data.semesters).toHaveLength(1)
    expect(result.data.semesters[0]?.name).toBe('SPRING 2026')
    expect(result.data.semesters[0]?.courses).toHaveLength(1)
  })

  it('creates an empty semester and stamps lastModified even with no courses', () => {
    const result = applyImportedCourses(makeData(), 'Winter 2026-2027', [], NOW)

    expect(result.report).toEqual({
      createdSemester: true,
      createdCourses: [],
      updatedCourses: [],
    })
    expect(result.data.semesters[0]?.courses).toEqual([])
    expect(result.data.lastModified).toBe(NOW)
  })

  it('translates the target name before matching, mirroring legacy', () => {
    const data = makeData([{ id: 'sem1', name: 'קיץ 2025', courses: [] }])
    const result = applyImportedCourses(data, 'קיץ 2025', [], NOW)

    // The Hebrew-named semester is not matched; a translated one is created.
    expect(result.report.createdSemester).toBe(true)
    expect(result.data.semesters.map((s) => s.name)).toEqual(['קיץ 2025', 'Summer 2025'])
  })
})

describe('applyImportedCourses — creating courses', () => {
  it('creates a course with joined lists, exams, schedule and schema defaults', () => {
    const imported = makeImported({
      name: 'אלגוריתמים 1',
      lecturers: ['פרופ׳ רבני', 'דניאל כהן'],
      locations: ['אולמן 305', 'טאוב 9'],
      schedule: [{ day: 0, start: '10:30', end: '12:30' }],
      exams: { moedA: '2026-07-01', moedB: '' },
    })
    const result = applyImportedCourses(makeData(), 'Spring 2026', [imported], NOW)

    const course = result.data.semesters[0]?.courses[0]
    expect(course).toMatchObject({
      name: 'אלגוריתמים 1',
      number: '',
      lecturer: 'פרופ׳ רבני, דניאל כהן',
      location: 'אולמן 305, טאוב 9',
      schedule: [{ day: 0, start: '10:30', end: '12:30' }],
      exams: { moedA: '2026-07-01', moedB: '' },
      homeworkSort: 'date_asc',
      showCompletedHomework: true,
      homework: [],
      grade: '',
      points: '',
    })
    expect(course?.id).toBeTruthy()
    expect(course?.recordings.tabs.map((t) => t.id)).toEqual(['lectures', 'tutorials'])
    expect(result.report.createdCourses).toEqual(['אלגוריתמים 1'])
  })

  it('extracts a leading 6-8 digit number prefix from the name', () => {
    const result = applyImportedCourses(
      makeData(),
      'Spring 2026',
      [makeImported({ name: '234247 - אלגוריתמים 1' }), makeImported({ name: '23624700 – מערכות' })],
      NOW,
    )

    const courses = result.data.semesters[0]?.courses ?? []
    expect(courses.map((c) => ({ name: c.name, number: c.number }))).toEqual([
      { name: 'אלגוריתמים 1', number: '234247' },
      { name: 'מערכות', number: '23624700' },
    ])
    expect(result.report.createdCourses).toEqual(['אלגוריתמים 1', 'מערכות'])
  })

  it('keeps the name intact when a number is already provided or the prefix is too short', () => {
    const result = applyImportedCourses(
      makeData(),
      'Spring 2026',
      [
        makeImported({ name: '234247 - אלגוריתמים 1', number: '104031' }),
        makeImported({ name: '12345 - קורס קצר' }),
      ],
      NOW,
    )

    const courses = result.data.semesters[0]?.courses ?? []
    expect(courses.map((c) => ({ name: c.name, number: c.number }))).toEqual([
      { name: '234247 - אלגוריתמים 1', number: '104031' },
      { name: '12345 - קורס קצר', number: '' },
    ])
  })

  it('walks the colorful palette from the existing course count', () => {
    const data = makeData([springWith([algoCourse()])])
    const result = applyImportedCourses(
      data,
      'Spring 2026',
      [makeImported({ name: 'קורס חדש' }), makeImported({ name: 'קורס נוסף' })],
      NOW,
    )

    const colors = result.data.semesters[0]?.courses.map((c) => c.color)
    expect(colors).toEqual(['hsl(0, 45%, 50%)', 'hsl(137, 45%, 50%)', 'hsl(274, 45%, 50%)'])
  })

  it('respects the mono and single color themes from settings', () => {
    const mono = applyImportedCourses(
      makeData([], { colorTheme: 'mono' }),
      'Spring 2026',
      [makeImported({ name: 'קורס' })],
      NOW,
    )
    expect(mono.data.semesters[0]?.courses[0]?.color).toBe('hsl(0, 0%, 50%)')

    const single = applyImportedCourses(
      makeData([], { colorTheme: 'single', baseColorHue: 200 }),
      'Spring 2026',
      [makeImported({ name: 'קורס' })],
      NOW,
    )
    expect(single.data.semesters[0]?.courses[0]?.color).toBe('hsl(200, 45%, 50%)')
  })

  it('throws when an imported course has an empty name', () => {
    const data = makeData([springWith([algoCourse()])])

    expect(() =>
      applyImportedCourses(data, 'Spring 2026', [makeImported({ name: '' })], NOW),
    ).toThrow()
    // In particular the empty name must not merge into the first course.
    expect(data.semesters[0]?.courses).toHaveLength(1)
  })
})

describe('applyImportedCourses — merging into existing courses', () => {
  it('matches by exact course number and fills empty exam dates', () => {
    const data = makeData([springWith([algoCourse({ number: '234247' })])])
    const imported = makeImported({
      name: 'שם שונה לגמרי',
      number: '234247',
      exams: { moedA: '2026-07-01', moedB: '2026-08-01' },
    })
    const result = applyImportedCourses(data, 'Spring 2026', [imported], NOW)

    const courses = result.data.semesters[0]?.courses ?? []
    expect(courses).toHaveLength(1)
    expect(courses[0]?.exams).toEqual({ moedA: '2026-07-01', moedB: '2026-08-01' })
    expect(result.report.updatedCourses).toEqual(['אלגוריתמים 1'])
    expect(result.report.createdCourses).toEqual([])
  })

  it('matches when the existing course name contains the imported number', () => {
    const data = makeData([springWith([algoCourse({ name: '234247 - אלגוריתמים' })])])
    const imported = makeImported({
      name: 'אחר',
      number: '234247',
      exams: { moedA: '2026-07-01', moedB: '' },
    })
    const result = applyImportedCourses(data, 'Spring 2026', [imported], NOW)

    expect(result.data.semesters[0]?.courses).toHaveLength(1)
    expect(result.report.updatedCourses).toEqual(['234247 - אלגוריתמים'])
  })

  it('matches when the existing name contains the imported name', () => {
    const data = makeData([springWith([algoCourse({ name: 'אלגוריתמים 1 מורחב' })])])
    const imported = makeImported({
      name: 'אלגוריתמים 1',
      exams: { moedA: '2026-07-01', moedB: '' },
    })
    const result = applyImportedCourses(data, 'Spring 2026', [imported], NOW)

    expect(result.data.semesters[0]?.courses).toHaveLength(1)
    expect(result.report.updatedCourses).toEqual(['אלגוריתמים 1 מורחב'])
  })

  it('never overwrites an existing exam date', () => {
    const data = makeData([
      springWith([algoCourse({ exams: { moedA: '2026-01-01', moedB: '' } })]),
    ])
    const imported = makeImported({
      name: 'אלגוריתמים 1',
      exams: { moedA: '2026-02-02', moedB: '2026-03-03' },
    })
    const result = applyImportedCourses(data, 'Spring 2026', [imported], NOW)

    expect(result.data.semesters[0]?.courses[0]?.exams).toEqual({
      moedA: '2026-01-01',
      moedB: '2026-03-03',
    })
  })

  it('adds only the missing schedule slots', () => {
    const data = makeData([
      springWith([algoCourse({ schedule: [{ day: 0, start: '10:30', end: '12:30' }] })]),
    ])
    const imported = makeImported({
      name: 'אלגוריתמים 1',
      schedule: [
        { day: 0, start: '10:30', end: '12:30' },
        { day: 3, start: '14:30', end: '15:30' },
      ],
    })
    const result = applyImportedCourses(data, 'Spring 2026', [imported], NOW)

    expect(result.data.semesters[0]?.courses[0]?.schedule).toEqual([
      { day: 0, start: '10:30', end: '12:30' },
      { day: 3, start: '14:30', end: '15:30' },
    ])
    expect(result.report.updatedCourses).toEqual(['אלגוריתמים 1'])
  })

  it('reports nothing and keeps course identity when nothing changed', () => {
    const data = makeData([
      springWith([
        algoCourse({
          exams: { moedA: '2026-07-01', moedB: '' },
          schedule: [{ day: 0, start: '10:30', end: '12:30' }],
        }),
      ]),
    ])
    const imported = makeImported({
      name: 'אלגוריתמים 1',
      exams: { moedA: '2026-07-01', moedB: '' },
      schedule: [{ day: 0, start: '10:30', end: '12:30' }],
    })
    const result = applyImportedCourses(data, 'Spring 2026', [imported], NOW)

    expect(result.report.updatedCourses).toEqual([])
    expect(result.report.createdCourses).toEqual([])
    expect(result.data.semesters[0]?.courses[0]).toBe(data.semesters[0]?.courses[0])
  })

  it('lets a later duplicate match a course created earlier in the same run', () => {
    const result = applyImportedCourses(
      makeData(),
      'Spring 2026',
      [
        makeImported({ name: 'תורת החישוביות' }),
        makeImported({ name: 'תורת החישוביות', exams: { moedA: '2026-07-09', moedB: '' } }),
      ],
      NOW,
    )

    expect(result.data.semesters[0]?.courses).toHaveLength(1)
    expect(result.data.semesters[0]?.courses[0]?.exams.moedA).toBe('2026-07-09')
    expect(result.report.createdCourses).toEqual(['תורת החישוביות'])
    expect(result.report.updatedCourses).toEqual(['תורת החישוביות'])
  })
})

describe('applyImportedCourses — purity', () => {
  it('does not mutate the input AppData', () => {
    const data = makeData([
      springWith([algoCourse({ schedule: [{ day: 0, start: '10:30', end: '12:30' }] })]),
      { id: 'sem2', name: 'Winter 2025-2026', courses: [] },
    ])
    const snapshot = structuredClone(data)

    const result = applyImportedCourses(
      data,
      'Spring 2026',
      [
        makeImported({ name: 'אלגוריתמים 1', exams: { moedA: '2026-07-01', moedB: '' } }),
        makeImported({ name: 'קורס חדש' }),
      ],
      NOW,
    )

    expect(data).toEqual(snapshot)
    expect(result.data).not.toBe(data)
    expect(result.data.semesters).not.toBe(data.semesters)
    // The untouched semester keeps its identity; the modified one is replaced.
    expect(result.data.semesters[1]).toBe(data.semesters[1])
    expect(result.data.semesters[0]).not.toBe(data.semesters[0])
  })

  it('sets lastModified on the result only', () => {
    const data = makeData()
    const result = applyImportedCourses(data, 'Spring 2026', [], NOW)

    expect(result.data.lastModified).toBe(NOW)
    expect(data.lastModified).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('applyImportedCourses — end-to-end with the ICS fixture', () => {
  it('imports the parsed fixture into a new semester', () => {
    const { courses, semesterHint } = parseIcs(icsFixture)
    const result = applyImportedCourses(makeData(), semesterHint ?? 'Imported', courses, NOW)

    expect(result.report.createdSemester).toBe(true)
    expect(result.report.createdCourses).toEqual([
      'אלגוריתמים 1',
      'מבוא למערכות הפעלה',
      'תכנות מערכות',
    ])

    const semester = result.data.semesters[0]
    expect(semester?.name).toBe('Spring 2026')

    const algo = semester?.courses[0]
    expect(algo?.exams).toEqual({ moedA: '2026-07-01', moedB: '2026-08-01' })
    expect(algo?.schedule).toHaveLength(2)
    expect(algo?.location).toBe('אולמן 305, טאוב 9')

    const systems = semester?.courses[2]
    expect(systems?.name).toBe('תכנות מערכות')
    expect(systems?.number).toBe('236363')
  })

  it('is a no-op on re-import of unprefixed courses', () => {
    const { courses } = parseIcs(icsFixture)
    const unprefixed = courses.slice(0, 2)

    const first = applyImportedCourses(makeData(), 'Spring 2026', unprefixed, NOW)
    const second = applyImportedCourses(first.data, 'Spring 2026', unprefixed, NOW)

    expect(second.report).toEqual({
      createdSemester: false,
      createdCourses: [],
      updatedCourses: [],
    })
    expect(second.data.semesters).toEqual(first.data.semesters)
  })
})
