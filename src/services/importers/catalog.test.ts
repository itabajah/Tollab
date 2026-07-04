import catalogRaw from './__fixtures__/technion-catalog.json?raw'
import lastSemestersRaw from './__fixtures__/last-semesters.json?raw'
import { courseSchema, type Course } from '@/domain/model'
import {
  TECHNION_SAP_BASE_URL,
  catalogUrls,
  enrichCourse,
  matchCatalogEntry,
  parseCatalog,
  parseLastSemesters,
  type CatalogEntry,
} from './catalog'

const catalog = parseCatalog(JSON.parse(catalogRaw))

const entryOf = (key: string): CatalogEntry => {
  const entry = catalog.get(key)
  if (!entry) throw new Error(`catalog entry not found: ${key}`)
  return entry
}

const makeCourse = (overrides: Record<string, unknown> = {}): Course =>
  courseSchema.parse({ id: 'c1', name: 'אלגוריתמים 1', color: 'hsl(0, 45%, 50%)', ...overrides })

describe('parseCatalog', () => {
  it('keys entries by digit-stripped course number and skips numberless items', () => {
    expect([...catalog.keys()]).toEqual(['02340247', '02340123', '01040031'])
  })

  it('maps all Hebrew fields of a full entry, extracting the date from exam values with times', () => {
    expect(entryOf('02340247')).toEqual({
      number: '02340247',
      name: 'אלגוריתמים 1',
      points: '3.0',
      lecturer: "פרופ' יובל רבני",
      faculty: 'מדעי המחשב',
      syllabus: 'עקרונות בתכנון וניתוח של אלגוריתמים: חמדנות, תכנות דינמי, זרימה ברשתות.',
      moedA: '2026-07-13',
      moedB: '2026-08-10',
    })
  })

  it('converts bare dd-MM-yyyy exam dates and leaves absent fields empty', () => {
    const entry = entryOf('02340123')
    expect(entry.moedA).toBe('2026-07-05')
    expect(entry.moedB).toBe('')
    expect(entry.syllabus).toBe('')
  })

  it('yields empty strings for non-date exam text and missing lecturer', () => {
    const entry = entryOf('01040031')
    expect(entry.moedB).toBe('')
    expect(entry.moedA).toBe('')
    expect(entry.lecturer).toBe('')
  })

  it('returns an empty map for non-array input', () => {
    expect(parseCatalog(null).size).toBe(0)
    expect(parseCatalog({ courses: [] }).size).toBe(0)
    expect(parseCatalog('[]').size).toBe(0)
  })

  it('accepts flat items carrying the Hebrew keys directly', () => {
    const flat = parseCatalog([{ 'מספר מקצוע': '00970003', 'שם מקצוע': 'פיזיקה 1' }])
    expect(flat.get('00970003')?.name).toBe('פיזיקה 1')
  })

  it('coerces numeric field values to strings', () => {
    const parsed = parseCatalog([
      { general: { 'מספר מקצוע': '00940412', 'שם מקצוע': 'הסתברות', נקודות: 3.5 } },
    ])
    expect(parsed.get('00940412')?.points).toBe('3.5')
  })

  it('strips non-digits from the key but keeps the raw number on the entry', () => {
    const parsed = parseCatalog([{ general: { 'מספר מקצוע': '0234-0247', 'שם מקצוע': 'א' } }])
    expect(parsed.get('02340247')?.number).toBe('0234-0247')
  })

  it('extracts a date embedded in surrounding Hebrew text', () => {
    const parsed = parseCatalog([
      {
        general: {
          'מספר מקצוע': '00000001',
          'מועד א': "בתאריך 13-07-2026 יום ב' משעה 09:00",
          'מועד ב': '10.08.2026 13:00',
        },
      },
    ])
    expect(parsed.get('00000001')?.moedA).toBe('2026-07-13')
    expect(parsed.get('00000001')?.moedB).toBe('2026-08-10')
  })
})

describe('matchCatalogEntry', () => {
  it('matches an exact digit-normalized number', () => {
    expect(matchCatalogEntry(catalog, { number: '02340247', name: '' })).toBe(entryOf('02340247'))
    expect(matchCatalogEntry(catalog, { number: '0234-0247', name: '' })).toBe(entryOf('02340247'))
  })

  it('matches when the local number lacks the leading zero', () => {
    expect(matchCatalogEntry(catalog, { number: '2340247', name: '' })).toBe(entryOf('02340247'))
  })

  it('matches leading-zero-stripped equality in the other direction', () => {
    const inline = parseCatalog([
      { general: { 'מספר מקצוע': '2340247', 'שם מקצוע': 'אלגוריתמים 1' } },
    ])
    expect(matchCatalogEntry(inline, { number: '02340247', name: '' })).toBe(inline.get('2340247'))
  })

  it('falls back to a contains match for 5+ digit numbers', () => {
    expect(matchCatalogEntry(catalog, { number: '23402', name: '' })).toBe(entryOf('02340247'))
  })

  it('does not fuzzy-match numbers shorter than 5 digits', () => {
    expect(matchCatalogEntry(catalog, { number: '4031', name: 'אין כזה מקצוע' })).toBeNull()
  })

  it('falls back to catalog-name-contains-local-name', () => {
    expect(matchCatalogEntry(catalog, { number: '', name: 'אלגוריתמים' })).toBe(entryOf('02340247'))
  })

  it('matches a legacy 6-digit number via the name fallback', () => {
    // 234247 is not a substring of the SAP number 02340247, so only the name matches.
    expect(matchCatalogEntry(catalog, { number: '234247', name: 'אלגוריתמים 1' })).toBe(
      entryOf('02340247'),
    )
  })

  it('compares names case-insensitively', () => {
    const inline = parseCatalog([
      { general: { 'מספר מקצוע': '01230123', 'שם מקצוע': 'Linear Algebra 1' } },
    ])
    expect(matchCatalogEntry(inline, { number: '', name: 'linear algebra' })).toBe(
      inline.get('01230123'),
    )
  })

  it('ignores whitespace-only names', () => {
    expect(matchCatalogEntry(catalog, { number: '', name: '   ' })).toBeNull()
  })

  it('returns null when nothing matches or the catalog is empty', () => {
    expect(matchCatalogEntry(catalog, { number: '999999', name: 'מקצוע עלום' })).toBeNull()
    expect(matchCatalogEntry(new Map(), { number: '02340247', name: 'אלגוריתמים 1' })).toBeNull()
  })
})

describe('enrichCourse', () => {
  it('fills every empty field from the catalog entry', () => {
    const course = makeCourse()
    const enriched = enrichCourse(course, entryOf('02340247'))

    expect(enriched).toMatchObject({
      number: '02340247',
      points: '3.0',
      lecturer: "פרופ' יובל רבני",
      faculty: 'מדעי המחשב',
      syllabus: 'עקרונות בתכנון וניתוח של אלגוריתמים: חמדנות, תכנות דינמי, זרימה ברשתות.',
      exams: { moedA: '2026-07-13', moedB: '2026-08-10' },
    })
    expect(enriched.name).toBe(course.name)
    expect(enriched.color).toBe(course.color)
  })

  it('never overwrites non-empty course fields', () => {
    const course = makeCourse({
      number: '123456',
      points: '4.0',
      lecturer: 'מרצה קיים',
      faculty: 'פקולטה קיימת',
      syllabus: 'סילבוס קיים',
      exams: { moedA: '2026-01-01', moedB: '2026-02-02' },
    })
    const enriched = enrichCourse(course, entryOf('02340247'))

    expect(enriched).toEqual(course)
  })

  it('keeps empty course fields empty when the entry is empty too', () => {
    const emptyEntry: CatalogEntry = {
      number: '',
      name: '',
      points: '',
      lecturer: '',
      faculty: '',
      syllabus: '',
      moedA: '',
      moedB: '',
    }
    const course = makeCourse({ lecturer: 'מרצה' })

    expect(enrichCourse(course, emptyEntry)).toEqual(course)
  })

  it('fills only the empty fields in a mixed course', () => {
    const course = makeCourse({
      points: '5.0',
      exams: { moedA: '2026-01-01', moedB: '' },
    })
    const enriched = enrichCourse(course, entryOf('02340247'))

    expect(enriched.points).toBe('5.0')
    expect(enriched.exams).toEqual({ moedA: '2026-01-01', moedB: '2026-08-10' })
    expect(enriched.faculty).toBe('מדעי המחשב')
  })

  it('returns a new object and leaves the input untouched', () => {
    const course = makeCourse()
    const snapshot = structuredClone(course)
    const enriched = enrichCourse(course, entryOf('02340247'))

    expect(course).toEqual(snapshot)
    expect(enriched).not.toBe(course)
    expect(enriched.exams).not.toBe(course.exams)
    // Untouched nested structures may keep their identity.
    expect(enriched.schedule).toBe(course.schedule)
    expect(enriched.recordings).toBe(course.recordings)
  })
})

describe('catalogUrls', () => {
  it('builds the legacy file URLs from a base with a trailing slash', () => {
    expect(catalogUrls('https://example.test/data/', 2026, 201)).toEqual({
      lastSemesters: 'https://example.test/data/last_semesters.json',
      courses: 'https://example.test/data/courses_2026_201.json',
    })
  })

  it('adds the missing trailing slash', () => {
    expect(catalogUrls('https://example.test/data', 2025, 200).courses).toBe(
      'https://example.test/data/courses_2025_200.json',
    )
  })

  it('exposes the legacy Technion SAP base URL', () => {
    expect(TECHNION_SAP_BASE_URL).toBe(
      'https://raw.githubusercontent.com/michael-maltsev/technion-sap-info-fetcher/gh-pages/',
    )
    expect(catalogUrls(TECHNION_SAP_BASE_URL, 2026, 201).lastSemesters).toBe(
      `${TECHNION_SAP_BASE_URL}last_semesters.json`,
    )
  })
})

describe('parseLastSemesters', () => {
  it('parses the fixture into year/semester refs', () => {
    expect(parseLastSemesters(JSON.parse(lastSemestersRaw))).toEqual([
      { year: 2026, semester: 201 },
      { year: 2025, semester: 200 },
      { year: 2025, semester: 202 },
    ])
  })

  it('skips malformed entries and coerces numeric strings', () => {
    const refs = parseLastSemesters([
      { year: 2025 },
      { semester: 200 },
      null,
      'x',
      { year: '2024', semester: '202' },
      { year: 2023, semester: 202 },
      { year: '', semester: 200 },
    ])
    expect(refs).toEqual([
      { year: 2024, semester: 202 },
      { year: 2023, semester: 202 },
    ])
  })

  it('returns an empty list for non-array input', () => {
    expect(parseLastSemesters(null)).toEqual([])
    expect(parseLastSemesters({ year: 2025, semester: 200 })).toEqual([])
  })

  it('feeds catalogUrls for each fetched semester', () => {
    const refs = parseLastSemesters(JSON.parse(lastSemestersRaw))
    const urls = refs.map(
      (ref) => catalogUrls(TECHNION_SAP_BASE_URL, ref.year, ref.semester).courses,
    )
    expect(urls).toEqual([
      `${TECHNION_SAP_BASE_URL}courses_2026_201.json`,
      `${TECHNION_SAP_BASE_URL}courses_2025_200.json`,
      `${TECHNION_SAP_BASE_URL}courses_2025_202.json`,
    ])
  })
})
