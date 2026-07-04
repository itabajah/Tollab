import {
  compareSemesters,
  createSemester,
  extractYear,
  generateSemesterOptions,
  seasonValue,
  sortSemesters,
} from './semester'

describe('extractYear', () => {
  it('finds the first 4-digit year in a name', () => {
    expect(extractYear('Winter 2024-2025')).toBe(2024)
    expect(extractYear('Spring 2025')).toBe(2025)
    expect(extractYear('no year here')).toBe(0)
  })
})

describe('seasonValue', () => {
  it('ranks winter > summer > spring, in English and Hebrew', () => {
    expect(seasonValue('Winter 2024-2025')).toBe(3)
    expect(seasonValue('Summer 2024')).toBe(2)
    expect(seasonValue('Spring 2024')).toBe(1)
    expect(seasonValue('חורף תשפ"ה 2024')).toBe(3)
    expect(seasonValue('קיץ 2024')).toBe(2)
    expect(seasonValue('אביב 2024')).toBe(1)
    expect(seasonValue('Custom name')).toBe(0)
  })
})

describe('compareSemesters / sortSemesters', () => {
  it('sorts newest first: by year desc, then winter > summer > spring', () => {
    const names = ['Spring 2024', 'Winter 2024-2025', 'Summer 2024', 'Spring 2025']
    const sorted = sortSemesters(names.map((name, i) => ({ id: `s${i}`, name }))).map((s) => s.name)
    expect(sorted).toEqual(['Spring 2025', 'Winter 2024-2025', 'Summer 2024', 'Spring 2024'])
  })

  it('is stable comparator output for identical names', () => {
    expect(compareSemesters({ name: 'Spring 2025' }, { name: 'Spring 2025' })).toBe(0)
  })
})

describe('generateSemesterOptions', () => {
  it('generates 9 options: 3 seasons × (prev, current, next year), winter spanning years', () => {
    const options = generateSemesterOptions(new Date('2026-07-04'))
    expect(options).toHaveLength(9)
    expect(options).toContain('Winter 2025-2026')
    expect(options).toContain('Winter 2026-2027')
    expect(options).toContain('Spring 2027')
    expect(options).toContain('Summer 2025')
    expect(options[0]).toBe('Winter 2025-2026')
  })
})

describe('createSemester', () => {
  it('creates a semester with defaults', () => {
    const s = createSemester('Winter 2026-2027', 'sem1')
    expect(s.id).toBe('sem1')
    expect(s.name).toBe('Winter 2026-2027')
    expect(s.courses).toEqual([])
    expect(s.calendarSettings).toEqual({
      startHour: 8,
      endHour: 20,
      visibleDays: [0, 1, 2, 3, 4, 5],
    })
    expect(s.examViewMode).toBe('auto')
  })
})
